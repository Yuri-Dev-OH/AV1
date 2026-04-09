import * as fs from 'fs';
import { Aeronave } from './Aeronave';

export class Relatorio {
    gerarRelatorioAeronave(aeronave: Aeronave, nomeCliente: string, dataEntrega: string): string {
        let conteudo = `=======================================\n`;
        conteudo += `      RELATORIO FINAL DE ENTREGA       \n`;
        conteudo += `=======================================\n`;
        conteudo += `Cliente: ${nomeCliente}\n`;
        conteudo += `Data de Entrega: ${dataEntrega}\n\n`;
        
        conteudo += `--- DADOS DA AERONAVE ---\n`;
        conteudo += `Codigo: ${aeronave.codigo}\n`;
        conteudo += `Modelo: ${aeronave.modelo}\n`;
        conteudo += `Tipo: ${aeronave.tipo}\n`;
        conteudo += `Capacidade: ${aeronave.capacidade} passageiros\n`;
        conteudo += `Alcance: ${aeronave.alcance} km\n\n`;
        
        conteudo += `--- PECAS UTILIZADAS ---\n`;
        if (aeronave.pecas.length === 0) conteudo += `Nenhuma peca registrada.\n`;
        aeronave.pecas.forEach(p => conteudo += `- ${p.nome} (Tipo: ${p.tipo} | Fornecedor: ${p.fornecedor}) - Status: ${p.status}\n`);
        
        conteudo += `\n--- ETAPAS REALIZADAS ---\n`;
        if (aeronave.etapas.length === 0) conteudo += `Nenhuma etapa registrada.\n`;
        aeronave.etapas.forEach(e => conteudo += `- ${e.nome} (Prazo: ${e.prazo}) - Status: ${e.status}\n`);
        
        conteudo += `\n--- RESULTADOS DOS TESTES ---\n`;
        if (aeronave.testes.length === 0) conteudo += `Nenhum teste registrado.\n`;
        aeronave.testes.forEach(t => conteudo += `- Teste ${t.tipo}: ${t.resultado}\n`);
        
        conteudo += `=======================================\n`;
        return conteudo;
    }

    salvarRelatorio(aeronave: Aeronave, conteudo: string): void {
        const path = `./reports/Relatorio_${aeronave.codigo}.txt`;
        fs.writeFileSync(path, conteudo, 'utf8');
        console.log(`\n[SISTEMA] Relatorio salvo com sucesso no arquivo: ${path}`);
    }
}