import * as fs from 'fs';
import { TipoTeste, ResultadoTeste } from '../enums/Enums';

export class Teste {
    constructor(
        public tipo: TipoTeste,
        public resultado: ResultadoTeste
    ) {}

    salvar(): void {
        const data = `${this.tipo};${this.resultado}\n`;
        fs.appendFileSync('./data/testes.txt', data, 'utf8');
    }
}