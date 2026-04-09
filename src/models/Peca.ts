import * as fs from 'fs';
import { TipoPeca, StatusPeca } from '../enums/Enums';

export class Peca {
    constructor(
        public nome: string,
        public tipo: TipoPeca,
        public fornecedor: string,
        public status: StatusPeca
    ) {}

    atualizarStatus(novoStatus: StatusPeca): void {
        this.status = novoStatus; // [cite: 101]
    }

    salvar(): void {
        const data = `${this.nome};${this.tipo};${this.fornecedor};${this.status}\n`;
        fs.appendFileSync('./data/pecas.txt', data, 'utf8');
    }
}