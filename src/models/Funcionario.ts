import * as fs from 'fs';
import { NivelPermissao } from '../enums/Enums';

export class Funcionario {
    constructor(
        public id: string,
        public nome: string,
        public telefone: string,
        public endereco: string,
        public usuario: string,
        public senha: string,
        public nivelPermissao: NivelPermissao
    ) {}

    autenticar(usuario: string, senha: string): boolean {
        return this.usuario === usuario && this.senha === senha; // [cite: 108]
    }

    salvar(): void {
        const data = `${this.id};${this.nome};${this.telefone};${this.endereco};${this.usuario};${this.senha};${this.nivelPermissao}\n`;
        fs.appendFileSync('./data/funcionarios.txt', data, 'utf8'); // [cite: 118]
    }

    static carregar(): Funcionario[] {
        if (!fs.existsSync('./data/funcionarios.txt')) return [];
        const linhas = fs.readFileSync('./data/funcionarios.txt', 'utf8').split('\n').filter(l => l);
        return linhas.map(linha => {
            const [id, nome, tel, end, user, pass, nivel] = linha.split(';');
            return new Funcionario(id, nome, tel, end, user, pass, nivel as NivelPermissao);
        });
    }
}