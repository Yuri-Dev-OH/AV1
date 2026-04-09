// ============================================================================
// AEROCODE CLI - CORE SYSTEM ENTRY POINT
// ============================================================================
// Arquivo principal que gerencia o fluxo de controle (Control) da aplicacao, 
// conectando a interface de usuario (CLI) com as entidades de dominio (Models).
// Implementa um padrao State simples para manter a sessao do usuario ativa.
// ============================================================================

import * as fs from 'fs';
import * as readlineSync from 'readline-sync';
import { Funcionario } from './models/Funcionario';
import { Aeronave } from './models/Aeronave';
import { Peca } from './models/Peca';
import { Etapa } from './models/Etapa';
import { Teste } from './models/Teste';
import { Relatorio } from './models/Relatorio';
import { NivelPermissao, TipoAeronave, TipoPeca, StatusPeca, StatusEtapa, TipoTeste, ResultadoTeste } from './enums/Enums';

// --- INITIALIZATION ---
// Garante a existencia da infraestrutura de diretorios para os arquivos flat (.txt)
if (!fs.existsSync('./data')) fs.mkdirSync('./data');
if (!fs.existsSync('./reports')) fs.mkdirSync('./reports');

// --- IN-MEMORY DATABASE ---
// Estruturas de dados em memoria para reduzir operacoes de I/O durante a sessao.
// O modulo 'Funcionario' ja inicializa buscando dados persistidos (se existirem).
let funcionariosCadastrados: Funcionario[] = Funcionario.carregar() || [];
let aeronavesCadastradas: Aeronave[] = []; 
let pecasCadastradas: Peca[] = [];

// Sessao do usuario atual. Null indica que nenhum usuario esta autenticado.
let usuarioLogado: Funcionario | null = null;

/**
 * Utilitario de Persistencia em Lote (Batch Save).
 * Sobrescreve o arquivo de funcionarios com o estado atual da memoria.
 * Essencial para refletir atualizacoes de estado e delecoes (CRUD).
 */
function salvarTodosFuncionarios() {
    fs.writeFileSync('./data/funcionarios.txt', '', 'utf8');
    funcionariosCadastrados.forEach(f => f.salvar());
}

// ==========================================
// 1. DADOS PRIMORDIAIS COMPLETO (Mocking / Seed)
// ==========================================
/**
 * Injeta dados de dominio base para que a aplicacao nao inicie vazia.
 * Estabelece relacoes essenciais: Administrador base e relacionamentos 
 * Aeronave -> Peca/Etapa/Teste.
 */
function inicializarDadosPrimordiais() {
    console.log("[Sistema] Verificando dados primordiais...");
    
    // Seed de Usuarios. Garante ao menos 1 usuario de cada nivel hierarquico.
    if (funcionariosCadastrados.length === 0) {
        const admin = new Funcionario("001", "Yuri Goncalves", "12999999999", "SJC", "admin", "admin123", NivelPermissao.ADMINISTRADOR);
        const engenheiro = new Funcionario("002", "Engenheiro Chefe", "12888888888", "SJC", "engenheiro", "eng123", NivelPermissao.ENGENHEIRO);
        const operador = new Funcionario("003", "Operador Padrao", "12777777777", "SJC", "operador", "op123", NivelPermissao.OPERADOR);
        
        admin.salvar(); engenheiro.salvar(); operador.salvar();
        funcionariosCadastrados.push(admin, engenheiro, operador);
    }

    // Seed de Producao. Mostra como o dominio Aeronave agrega seus componentes.
    if (aeronavesCadastradas.length === 0) {
        const aviao1 = new Aeronave("EMB-314", "Super Tucano", TipoAeronave.MILITAR, 2, 1330);
        const aviao2 = new Aeronave("EMB-195", "E-Jet E2", TipoAeronave.COMERCIAL, 146, 4815);
        
        const motor = new Peca("Motor Pratt & Whitney", TipoPeca.IMPORTADA, "P&W", StatusPeca.PRONTA);
        const fuselagem = new Peca("Fuselagem Central", TipoPeca.NACIONAL, "Embraer SJC", StatusPeca.EM_PRODUCAO);
        
        const etapaMontagem = new Etapa("Montagem Estrutural", "2026-05-10", StatusEtapa.ANDAMENTO);
        if (funcionariosCadastrados[1]) etapaMontagem.adicionarFuncionario(funcionariosCadastrados[1]);
        
        const testeEletrico = new Teste(TipoTeste.ELETRICO, ResultadoTeste.APROVADO);

        // Agregacao relacional: Vincula os objetos a instancia principal (Aeronave)
        aviao1.pecas.push(motor, fuselagem);
        aviao1.etapas.push(etapaMontagem);
        aviao1.testes.push(testeEletrico);

        // Persiste as entidades independentes e as relacoes
        aviao1.salvar(); aviao2.salvar();
        motor.salvar(); fuselagem.salvar();
        testeEletrico.salvar();
        
        aeronavesCadastradas.push(aviao1, aviao2);
        pecasCadastradas.push(motor, fuselagem);
    }
}

// ==========================================
// 2. SISTEMA DE LOGIN (Authentication Service)
// ==========================================
/**
 * Gerencia a porta de entrada da aplicacao.
 * Requer validacao bem-sucedida pelo metodo 'autenticar' do dominio Funcionario.
 * @returns {boolean} Status da sessao (True se autorizado).
 */
function telaLogin(): boolean {
    console.clear();
    console.log("=======================================");
    console.log("       AEROCODE - GESTAO DE PRODUCAO   ");
    console.log("=======================================\n");
    console.log(">> INSTRUCOES DE ACESSO:");
    console.log("- Admin:      Usuario: admin      | Senha: admin123");
    console.log("- Engenheiro: Usuario: engenheiro | Senha: eng123");
    console.log("- Operador:   Usuario: operador   | Senha: op123\n");

    const usuarioInput = readlineSync.question('Digite seu Usuario: ');
    const senhaInput = readlineSync.question('Digite sua Senha: ', { hideEchoBack: true });

    // Busca usuario correspondente e delega verificacao da senha a propria classe
    const funcionarioEncontrado = funcionariosCadastrados.find(f => f.usuario === usuarioInput);

    if (funcionarioEncontrado && funcionarioEncontrado.autenticar(usuarioInput, senhaInput)) {
        usuarioLogado = funcionarioEncontrado; // Inicia a sessao
        console.log(`\n[OK] Login efetuado! Bem-vindo(a), ${usuarioLogado.nome}.`);
        readlineSync.question('Pressione [ENTER] para continuar...');
        return true;
    } else {
        console.log(`\n[ERRO] Usuario ou senha incorretos.`);
        readlineSync.question('Pressione [ENTER] para tentar novamente...');
        return false;
    }
}

// ==========================================
// 3. MENUS ESPECIFICOS E CONTROLADORES (Controllers)
// ==========================================

/**
 * Controller: Funcionario
 * Acesso exclusivo para o NivelPermissao.ADMINISTRADOR.
 * Gerencia ciclo de vida (CRUD) da mao-de-obra e escalonamento de privilegios.
 */
function menuFuncionarios() {
    let sair = false;
    const niveis = [NivelPermissao.ADMINISTRADOR, NivelPermissao.ENGENHEIRO, NivelPermissao.OPERADOR];

    while (!sair) {
        console.clear();
        console.log("--- MODULO: GERENCIAR FUNCIONARIOS ---");
        
        const opcoes = [
            'Listar Funcionarios', 
            'Cadastrar Novo Funcionario', 
            'Editar Funcionario', 
            'Excluir Funcionario'
        ];

        const index = readlineSync.keyInSelect(opcoes, 'Opcao: ', { cancel: 'Voltar ao Menu Principal' });
        if (index === -1) { sair = true; continue; }

        switch (opcoes[index]) {
            case 'Listar Funcionarios':
                console.clear();
                console.log("--- FUNCIONARIOS CADASTRADOS ---");
                funcionariosCadastrados.forEach(f => {
                    console.log(`ID: ${f.id} | Nome: ${f.nome} | Nivel: ${f.nivelPermissao}`);
                    console.log(`   Tel: ${f.telefone} | Endereco: ${f.endereco} | User: ${f.usuario}\n`);
                });
                readlineSync.question('Pressione [ENTER] para voltar...');
                break;

            case 'Cadastrar Novo Funcionario':
                console.clear();
                console.log("--- CADASTRAR FUNCIONARIO ---");
                const id = readlineSync.question('ID Unico (ex: 004): ');
                const nome = readlineSync.question('Nome Completo: ');
                const tel = readlineSync.question('Telefone: ');
                const end = readlineSync.question('Endereco: ');
                const user = readlineSync.question('Nome de Usuario (Login): ');
                const senha = readlineSync.question('Senha: ', { hideEchoBack: true });
                
                const nIndex = readlineSync.keyInSelect(niveis, 'Selecione o Nivel de Permissao:', { cancel: false });

                const novoFunc = new Funcionario(id, nome, tel, end, user, senha, niveis[nIndex]);
                funcionariosCadastrados.push(novoFunc);
                salvarTodosFuncionarios();
                
                console.log(`\n[OK] Funcionario ${nome} cadastrado com sucesso!`);
                readlineSync.question('Pressione [ENTER] para voltar...');
                break;

            case 'Editar Funcionario':
                console.clear();
                console.log("--- EDITAR FUNCIONARIO ---");
                const nomesParaEditar = funcionariosCadastrados.map(f => `${f.id} - ${f.nome} [${f.nivelPermissao}]`);
                const fIndexEdit = readlineSync.keyInSelect(nomesParaEditar, 'Escolha quem deseja editar:', { cancel: 'Cancelar' });
                
                if (fIndexEdit !== -1) {
                    const func = funcionariosCadastrados[fIndexEdit];
                    const campos = ['Nome', 'Telefone', 'Endereco', 'Usuario', 'Senha', 'Nivel de Permissao'];
                    const cIndex = readlineSync.keyInSelect(campos, 'O que deseja alterar?', { cancel: 'Cancelar' });
                    
                    if (cIndex !== -1) {
                        switch (campos[cIndex]) {
                            // Operador logico OR (||) mantem o dado atual caso o input seja vazio
                            case 'Nome': func.nome = readlineSync.question(`Novo Nome (Atual: ${func.nome}): `) || func.nome; break;
                            case 'Telefone': func.telefone = readlineSync.question(`Novo Telefone (Atual: ${func.telefone}): `) || func.telefone; break;
                            case 'Endereco': func.endereco = readlineSync.question(`Novo Endereco (Atual: ${func.endereco}): `) || func.endereco; break;
                            case 'Usuario': func.usuario = readlineSync.question(`Novo Usuario (Atual: ${func.usuario}): `) || func.usuario; break;
                            case 'Senha': func.senha = readlineSync.question(`Nova Senha: `, { hideEchoBack: true }) || func.senha; break;
                            case 'Nivel de Permissao':
                                const nvIndex = readlineSync.keyInSelect(niveis, 'Novo Nivel de Permissao:', { cancel: false });
                                
                                // REGRA DE NEGOCIO: Evita que o sistema fique inoperavel ao rebaixar o unico administrador.
                                if (func.nivelPermissao === NivelPermissao.ADMINISTRADOR && niveis[nvIndex] !== NivelPermissao.ADMINISTRADOR) {
                                    const totalAdmins = funcionariosCadastrados.filter(f => f.nivelPermissao === NivelPermissao.ADMINISTRADOR).length;
                                    if (totalAdmins <= 1) {
                                        console.log("\n[ERRO CRITICO] Este e o ultimo Administrador ativo. Voce nao pode rebaixa-lo de nivel.");
                                        break;
                                    }
                                }
                                func.nivelPermissao = niveis[nvIndex];
                                break;
                        }
                        salvarTodosFuncionarios();
                        console.log("\n[OK] Dados do funcionario atualizados!");
                    }
                }
                readlineSync.question('Pressione [ENTER] para voltar...');
                break;

            case 'Excluir Funcionario':
                console.clear();
                console.log("--- EXCLUIR FUNCIONARIO ---");
                const nomesParaExcluir = funcionariosCadastrados.map(f => `${f.id} - ${f.nome} [${f.nivelPermissao}]`);
                const fIndexDel = readlineSync.keyInSelect(nomesParaExcluir, 'Escolha quem deseja EXCLUIR:', { cancel: 'Cancelar' });

                if (fIndexDel !== -1) {
                    const funcDel = funcionariosCadastrados[fIndexDel];

                    // PREVENCAO DE ERRO: Nao permite o usuario deletar a propria sessao ativa.
                    if (funcDel.id === usuarioLogado?.id) {
                        console.log("\n[ERRO] Voce nao pode excluir seu proprio usuario enquanto esta logado!");
                        readlineSync.question('Pressione [ENTER] para voltar...');
                        break;
                    }

                    // PREVENCAO DE ERRO: Garante ao menos 1 super-usuario no DB.
                    if (funcDel.nivelPermissao === NivelPermissao.ADMINISTRADOR) {
                        const totalAdmins = funcionariosCadastrados.filter(f => f.nivelPermissao === NivelPermissao.ADMINISTRADOR).length;
                        if (totalAdmins <= 1) {
                            console.log("\n[ERRO CRITICO] Este e o ultimo Administrador ativo. O sistema exige pelo menos 1 administrador.");
                            readlineSync.question('Pressione [ENTER] para voltar...');
                            break;
                        }
                    }

                    const confirmacao = readlineSync.keyInYNStrict(`Tem certeza absoluta que deseja EXCLUIR o funcionario ${funcDel.nome}?`);
                    if (confirmacao) {
                        funcionariosCadastrados.splice(fIndexDel, 1);
                        salvarTodosFuncionarios();
                        console.log(`\n[OK] Funcionario excluido permanentemente.`);
                    }
                }
                readlineSync.question('Pressione [ENTER] para voltar...');
                break;
        }
    }
}

/**
 * Controller: Aeronave
 * Modulo core que reflete o controle de acesso baseado em funcoes (RBAC).
 */
function menuAeronaves() {
    let sair = false;
    while (!sair) {
        console.clear();
        console.log("--- MODULO: GERENCIAR AERONAVES ---");
        
        const opcoes = ['Listar Aeronaves'];
        
        // Controle de Acesso (RBAC) - Restricao por NivelPermissao
        if (usuarioLogado?.nivelPermissao === NivelPermissao.ADMINISTRADOR) {
            opcoes.push('Cadastrar Nova Aeronave');
        }
        
        // Relatorios sao restritos a gestao (Admin/Eng)
        if (usuarioLogado?.nivelPermissao === NivelPermissao.ADMINISTRADOR || usuarioLogado?.nivelPermissao === NivelPermissao.ENGENHEIRO) {
            opcoes.push('Gerar Relatorio Final de Entrega');
        }

        const index = readlineSync.keyInSelect(opcoes, 'Digite o NUMERO da opcao: ', { cancel: 'Voltar ao Menu Principal' });
        if (index === -1) { sair = true; continue; }

        switch (opcoes[index]) {
            case 'Listar Aeronaves':
                console.clear();
                console.log("--- LISTA DE AERONAVES ---");
                if (aeronavesCadastradas.length === 0) console.log("Nenhuma aeronave cadastrada.");
                // Chama o metodo padrao de formatacao definido no model Aeronave
                aeronavesCadastradas.forEach(a => a.detalhes());
                readlineSync.question('\nPressione [ENTER] para voltar...');
                break;

            case 'Cadastrar Nova Aeronave':
                console.clear();
                console.log("--- CADASTRO DE NOVA AERONAVE ---");
                const codigo = readlineSync.question('Codigo unico (ex: EMB-190): ');
                const modelo = readlineSync.question('Modelo (ex: E-Jet E2): ');
                
                console.log("\nSelecione o TIPO da aeronave:");
                const opcoesTipo = [TipoAeronave.COMERCIAL, TipoAeronave.MILITAR];
                const tipoIndex = readlineSync.keyInSelect(opcoesTipo, 'Numero do Tipo: ', { cancel: false });
                
                const capacidade = readlineSync.questionInt('\nCapacidade de passageiros (apenas numeros): ');
                const alcance = readlineSync.questionInt('Alcance em KM (apenas numeros): ');

                const novaAeronave = new Aeronave(codigo, modelo, opcoesTipo[tipoIndex], capacidade, alcance);
                novaAeronave.salvar();
                aeronavesCadastradas.push(novaAeronave);

                console.log(`\n[OK] Aeronave ${modelo} cadastrada!`);
                readlineSync.question('\nPressione [ENTER] para voltar...');
                break;

            case 'Gerar Relatorio Final de Entrega':
                console.clear();
                console.log("--- GERAR RELATORIO FINAL ---");
                const nomesAeronaves = aeronavesCadastradas.map(a => `${a.codigo} - ${a.modelo}`);
                const aeroIndex = readlineSync.keyInSelect(nomesAeronaves, 'Escolha a Aeronave para gerar o relatorio:', { cancel: 'Cancelar' });
                
                if (aeroIndex !== -1) {
                    const aviao = aeronavesCadastradas[aeroIndex];
                    
                    console.log("\nATENCAO: Forneca os dados abaixo sem acentos ou 'c' com cedilha.");
                    const cliente = readlineSync.question('Nome do Cliente: ');
                    const data = readlineSync.question('Data de Entrega (DD/MM/AAAA): ');
                    
                    // Injeta dependencias na Classe de Relatorio, que e responsavel 
                    // exclusiva pela consolidacao textual e I/O de arquivo txt.
                    const relatorio = new Relatorio();
                    const conteudo = relatorio.gerarRelatorioAeronave(aviao, cliente, data);
                    
                    // Limpeza RegExp para prevenir quebra de codificacao em SO Windows padrao
                    const conteudoSemAcento = conteudo.replace(/[áàãâä]/g,"a").replace(/[éèêë]/g,"e").replace(/[íìîï]/g,"i").replace(/[óòõôö]/g,"o").replace(/[úùûü]/g,"u").replace(/[ç]/g,"c").replace(/[ÁÀÃÂÄ]/g,"A").replace(/[ÉÈÊË]/g,"E").replace(/[ÍÌÎÏ]/g,"I").replace(/[ÓÒÕÔÖ]/g,"O").replace(/[ÚÙÛÜ]/g,"U").replace(/[Ç]/g,"C");
                    
                    relatorio.salvarRelatorio(aviao, conteudoSemAcento);
                }
                readlineSync.question('\nPressione [ENTER] para voltar...');
                break;
        }
    }
}

/**
 * Controller: Peca
 * Mostra controle de inventario e movimentacao de status da cadeia de suprimentos.
 */
function menuPecas() {
    let sair = false;
    while (!sair) {
        console.clear();
        console.log("--- MODULO: GERENCIAR PECAS ---");
        
        const opcoes = ['Listar Pecas'];
        
        if (usuarioLogado?.nivelPermissao === NivelPermissao.ADMINISTRADOR) {
            opcoes.push('Cadastrar Peca');
        }

        if (usuarioLogado?.nivelPermissao === NivelPermissao.ADMINISTRADOR || usuarioLogado?.nivelPermissao === NivelPermissao.OPERADOR) {
            opcoes.push('Atualizar Status da Peca');
        }

        const index = readlineSync.keyInSelect(opcoes, 'Digite o NUMERO da opcao: ', { cancel: 'Voltar ao Menu Principal' });
        if (index === -1) { sair = true; continue; }

        switch (opcoes[index]) {
            case 'Listar Pecas':
                console.clear();
                console.log("--- LISTA DE PECAS ---");
                if (pecasCadastradas.length === 0) {
                    console.log("Nenhuma peca cadastrada.");
                } else {
                    pecasCadastradas.forEach((p, i) => {
                        console.log(`[${i}] ${p.nome} | Tipo: ${p.tipo} | Fornecedor: ${p.fornecedor} | Status: ${p.status}`);
                    });
                }
                readlineSync.question('\nPressione [ENTER] para voltar...');
                break;

            case 'Cadastrar Peca':
                console.clear();
                const nome = readlineSync.question('Nome da Peca: ');
                const fornecedor = readlineSync.question('Fornecedor: ');
                
                const opcoesTipoPeca = [TipoPeca.NACIONAL, TipoPeca.IMPORTADA];
                const tipoIdx = readlineSync.keyInSelect(opcoesTipoPeca, 'Tipo da Peca: ', { cancel: false });
                
                const novaPeca = new Peca(nome, opcoesTipoPeca[tipoIdx], fornecedor, StatusPeca.EM_PRODUCAO);
                novaPeca.salvar();
                pecasCadastradas.push(novaPeca);
                console.log(`\n[OK] Peca cadastrada com status inicial EM_PRODUCAO.`);
                readlineSync.question('Pressione [ENTER] para voltar...');
                break;
                
            case 'Atualizar Status da Peca':
                if(pecasCadastradas.length === 0) { console.log("Nenhuma peca cadastrada."); break; }
                const nomesPecas = pecasCadastradas.map(p => `${p.nome} (Atual: ${p.status})`);
                const pIndex = readlineSync.keyInSelect(nomesPecas, 'Escolha a peca para atualizar:', { cancel: 'Cancelar' });
                
                if (pIndex !== -1) {
                    const statusPossiveis = [StatusPeca.EM_PRODUCAO, StatusPeca.EM_TRANSPORTE, StatusPeca.PRONTA];
                    const sIndex = readlineSync.keyInSelect(statusPossiveis, 'Novo status:', { cancel: false });
                    
                    // Modifica o estado atravez do metodo interno do dominio
                    pecasCadastradas[pIndex].atualizarStatus(statusPossiveis[sIndex]);
                    console.log("[OK] Status atualizado!");
                }
                readlineSync.question('\nPressione [ENTER] para voltar...');
                break;
        }
    }
}

/**
 * Controller: Etapas de Producao
 * Implementa rotas condicionadas e injecao de relacionamento:
 * Nenhuma etapa existe "solta". Ela deve pertencer ao array interno de uma Aeronave.
 */
function menuEtapas() {
    let sair = false;
    while (!sair) {
        console.clear();
        console.log("--- MODULO: ETAPAS DE PRODUCAO ---");

        if (aeronavesCadastradas.length === 0) {
            console.log("Nenhuma aeronave cadastrada. Voce precisa cadastrar um aviao primeiro.");
            readlineSync.question('\nPressione [ENTER] para voltar...');
            break;
        }

        const nomesAeronaves = aeronavesCadastradas.map(a => `${a.codigo} - ${a.modelo}`);
        
        // Roteamento condicional: O usuario define o escopo da acao
        const aeroIndex = readlineSync.keyInSelect(nomesAeronaves, 'Escolha a Aeronave para gerenciar as etapas: ', { cancel: 'Voltar ao Menu Principal' });

        if (aeroIndex === -1) { 
            sair = true; 
            continue; 
        }

        // Passa o contexto da arvore de objetos para o submenu gerenciar
        const aviaoSelecionado = aeronavesCadastradas[aeroIndex];
        menuGerenciarEtapasAeronave(aviaoSelecionado);
    }
}

function menuGerenciarEtapasAeronave(aviao: Aeronave) {
    let voltar = false;
    while (!voltar) {
        console.clear();
        console.log(`--- GERENCIANDO ETAPAS: ${aviao.codigo} (${aviao.modelo}) ---`);

        const opcoes = ['Listar Etapas da Aeronave'];
        
        if (usuarioLogado?.nivelPermissao === NivelPermissao.ADMINISTRADOR) {
            opcoes.push('Cadastrar Nova Etapa');
        }

        if (usuarioLogado?.nivelPermissao === NivelPermissao.ADMINISTRADOR || usuarioLogado?.nivelPermissao === NivelPermissao.OPERADOR) {
            opcoes.push('Iniciar uma Etapa', 'Finalizar uma Etapa', 'Alocar Funcionario');
        }
        
        const index = readlineSync.keyInSelect(opcoes, 'Opcao: ', { cancel: 'Voltar a selecao de Aeronave' });

        if (index === -1) { voltar = true; continue; }

        switch (opcoes[index]) {
            case 'Listar Etapas da Aeronave':
                console.clear();
                console.log(`--- LISTA DE ETAPAS (${aviao.codigo}) ---`);
                if (aviao.etapas.length === 0) {
                    console.log("Nenhuma etapa cadastrada para esta aeronave.");
                } else {
                    aviao.etapas.forEach((e, i) => {
                        console.log(`[${i}] ${e.nome} | Prazo: ${e.prazo} | Status: ${e.status}`);
                        const funcNames = e.funcionarios.map(f => f.nome).join(', ');
                        console.log(`    Funcionarios alocados: ${funcNames || 'Nenhum'}`);
                    });
                }
                readlineSync.question('\nPressione [ENTER] para voltar...');
                break;

            case 'Cadastrar Nova Etapa':
                console.clear();
                const nome = readlineSync.question('Nome da Etapa: ');
                const prazo = readlineSync.question('Prazo (DD/MM/AAAA): ');
                
                const novaEtapa = new Etapa(nome, prazo, StatusEtapa.PENDENTE);
                // Vinculo estrutural da Etapa com a Aeronave corrente
                aviao.etapas.push(novaEtapa);
                
                console.log(`\n[OK] Etapa '${nome}' vinculada com sucesso a aeronave ${aviao.codigo}.`);
                readlineSync.question('Pressione [ENTER] para voltar...');
                break;

            case 'Iniciar uma Etapa':
                if (aviao.etapas.length === 0) { console.log("\nNenhuma etapa cadastrada."); readlineSync.question('Pressione [ENTER]'); break; }
                
                const nomesParaIniciar = aviao.etapas.map(e => `${e.nome} (Atual: ${e.status})`);
                const startIdx = readlineSync.keyInSelect(nomesParaIniciar, 'Qual etapa deseja INICIAR?', { cancel: 'Cancelar' });
                
                if (startIdx !== -1) {
                    aviao.etapas[startIdx].iniciar();
                    console.log("[OK] Status da etapa alterado para ANDAMENTO!");
                }
                readlineSync.question('\nPressione [ENTER] para voltar...');
                break;

            case 'Finalizar uma Etapa':
                if (aviao.etapas.length === 0) { console.log("\nNenhuma etapa cadastrada."); readlineSync.question('Pressione [ENTER]'); break; }
                
                const nomesParaFinalizar = aviao.etapas.map(e => `${e.nome} (Atual: ${e.status})`);
                const finIdx = readlineSync.keyInSelect(nomesParaFinalizar, 'Qual etapa deseja FINALIZAR?', { cancel: 'Cancelar' });

                if (finIdx !== -1) {
                    // REGRA DE NEGOCIO: Validacao de Ordem Logica.
                    // Garante que o fluxo produtivo seja linear e nao pule etapas pendentes.
                    if (finIdx > 0 && aviao.etapas[finIdx - 1].status !== StatusEtapa.CONCLUIDA) {
                        console.log(`\n[ERRO DE ORDEM LOGICA] Operacao bloqueada pelo sistema!`);
                        console.log(`Motivo: A etapa anterior '${aviao.etapas[finIdx - 1].nome}' ainda nao foi concluida.`);
                    } else {
                        aviao.etapas[finIdx].finalizar();
                        console.log("\n[OK] Etapa finalizada com sucesso! Avance para a proxima.");
                    }
                }
                readlineSync.question('\nPressione [ENTER] para voltar...');
                break;

            case 'Alocar Funcionario':
                if (aviao.etapas.length === 0) { console.log("\nNenhuma etapa cadastrada."); readlineSync.question('Pressione [ENTER]'); break; }
                
                const eIdx = readlineSync.keyInSelect(aviao.etapas.map(e => e.nome), 'Escolha a etapa:', { cancel: 'Cancelar' });
                if (eIdx !== -1) {
                    const funcDisp = funcionariosCadastrados.map(f => `${f.nome} [${f.nivelPermissao}]`);
                    const fIdx = readlineSync.keyInSelect(funcDisp, 'Escolha o funcionario para alocar:', { cancel: 'Cancelar' });
                    
                    if (fIdx !== -1) {
                        aviao.etapas[eIdx].adicionarFuncionario(funcionariosCadastrados[fIdx]);
                        console.log(`\n[OK] Funcionario ${funcionariosCadastrados[fIdx].nome} alocado a etapa!`);
                    }
                }
                readlineSync.question('\nPressione [ENTER] para voltar...');
                break;
        }
    }
}

/**
 * Controller: Testes
 * Gerencia a qualidade das aeronaves produzidas (QA).
 */
function menuTestes() {
    let sair = false;
    while (!sair) {
        console.clear();
        console.log("--- MODULO: TESTES DE AERONAVES ---");

        if (aeronavesCadastradas.length === 0) {
            console.log("Nenhuma aeronave cadastrada. Voce precisa cadastrar um aviao primeiro.");
            readlineSync.question('\nPressione [ENTER] para voltar...');
            break;
        }

        const nomesAeronaves = aeronavesCadastradas.map(a => `${a.codigo} - ${a.modelo}`);
        
        const aeroIndex = readlineSync.keyInSelect(nomesAeronaves, 'Escolha a Aeronave para gerenciar os testes: ', { cancel: 'Voltar ao Menu Principal' });

        if (aeroIndex === -1) { 
            sair = true; 
            continue; 
        }

        const aviaoSelecionado = aeronavesCadastradas[aeroIndex];
        menuGerenciarTestesAeronave(aviaoSelecionado);
    }
}

function menuGerenciarTestesAeronave(aviao: Aeronave) {
    let voltar = false;
    while (!voltar) {
        console.clear();
        console.log(`--- GERENCIANDO TESTES: ${aviao.codigo} (${aviao.modelo}) ---`);

        const opcoes = ['Listar Testes da Aeronave'];
        
        if (usuarioLogado?.nivelPermissao === NivelPermissao.ADMINISTRADOR || usuarioLogado?.nivelPermissao === NivelPermissao.ENGENHEIRO) {
            opcoes.push('Registrar Novo Teste');
        }

        const index = readlineSync.keyInSelect(opcoes, 'Opcao: ', { cancel: 'Voltar a selecao de Aeronave' });

        if (index === -1) { voltar = true; continue; }

        switch (opcoes[index]) {
            case 'Listar Testes da Aeronave':
                console.clear();
                console.log(`--- LISTA DE TESTES (${aviao.codigo}) ---`);
                if (aviao.testes.length === 0) {
                    console.log("Nenhum teste registrado para esta aeronave.");
                } else {
                    aviao.testes.forEach((t, i) => {
                        console.log(`[${i}] Tipo: ${t.tipo} | Resultado: ${t.resultado}`);
                    });
                }
                readlineSync.question('\nPressione [ENTER] para voltar...');
                break;

            case 'Registrar Novo Teste':
                console.clear();
                const tipos = [TipoTeste.AERODINAMICO, TipoTeste.ELETRICO, TipoTeste.HIDRAULICO];
                const tipoIdx = readlineSync.keyInSelect(tipos, 'Selecione o Tipo do Teste:', { cancel: false });
                
                const resultados = [ResultadoTeste.APROVADO, ResultadoTeste.REPROVADO];
                const resIdx = readlineSync.keyInSelect(resultados, 'Selecione o Resultado do Teste:', { cancel: false });
                
                const novoTeste = new Teste(tipos[tipoIdx], resultados[resIdx]);
                novoTeste.salvar();
                aviao.testes.push(novoTeste);
                
                console.log(`\n[OK] Teste de ${tipos[tipoIdx]} vinculado com sucesso a aeronave ${aviao.codigo}.`);
                readlineSync.question('Pressione [ENTER] para voltar...');
                break;
        }
    }
}

// ==========================================
// 4. MENU PRINCIPAL E INICIO (Main Loop)
// ==========================================

/**
 * Ponto de navegacao mestre do sistema.
 * Gerencia o painel de acesso pos-login com base na permissao do usuario logado.
 */
function menuPrincipal() {
    let sair = false;
    while (!sair) {
        console.clear();
        console.log(`=== MENU PRINCIPAL ===`);
        console.log(`Logado como: ${usuarioLogado?.nome} | Nivel: [${usuarioLogado?.nivelPermissao}]\n`);
        
        const opcoes = [
            'Modulo de Aeronaves', 
            'Modulo de Pecas', 
            'Modulo de Etapas de Producao', 
            'Modulo de Testes'
        ];

        // Ocultacao condicional de rotas
        if (usuarioLogado?.nivelPermissao === NivelPermissao.ADMINISTRADOR) {
            opcoes.push('Modulo de Funcionarios (Acesso Restrito)');
        }

        const index = readlineSync.keyInSelect(opcoes, 'Digite o NUMERO do modulo desejado: ', { cancel: 'Sair / Deslogar' });
        
        // Logoff: Resetar sessao e quebrar loop do Menu
        if (index === -1) { 
            sair = true; 
            usuarioLogado = null; 
            continue; 
        }

        // Action Mapping
        switch (opcoes[index]) {
            case 'Modulo de Aeronaves': menuAeronaves(); break;
            case 'Modulo de Pecas': menuPecas(); break;
            case 'Modulo de Etapas de Producao': menuEtapas(); break;
            case 'Modulo de Testes': menuTestes(); break;
            case 'Modulo de Funcionarios (Acesso Restrito)': menuFuncionarios(); break;
        }
    }
}

/**
 * Ponto de entrada de compilacao (Bootstrap).
 * Controla o estado global do processo (Mantem a CLI escutando).
 */
function iniciarAplicacao() {
    inicializarDadosPrimordiais();
    while (true) {
        const logado = telaLogin();
        // A aplicacao fica retida dentro do menu principal enquanto houver sessao ativa.
        if (logado && usuarioLogado) {
            menuPrincipal();
        }
    }
}

iniciarAplicacao();