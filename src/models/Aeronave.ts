import * as fs from 'fs';
import { TipoAeronave } from '../enums/Enums';
import { Peca } from './Peca';
import { Etapa } from './Etapa';
import { Teste } from './Teste';

export class Aeronave {
    public pecas: Peca[] = [];
    public etapas: Etapa[] = [];
    public testes: Teste[] = [];

    constructor(
        public codigo: string,
        public modelo: string,
        public tipo: TipoAeronave,
        public capacidade: number,
        public alcance: number
    ) {}

    detalhes(): void {
        console.log(`\n==========================================`);
        console.log(`  DETALHES DA AERONAVE [${this.codigo}]`);
        console.log(`==========================================`);
        console.log(`Modelo: ${this.modelo} | Tipo: ${this.tipo}`);
        console.log(`Capacidade: ${this.capacidade} passageiros | Alcance: ${this.alcance} km\n`);
        
        // Melhoria: Mostrando o que significa cada número
        console.log(`📋 PECAS ASSOCIADAS (${this.pecas.length}):`);
        if (this.pecas.length === 0) {
            console.log("   Nenhuma peca associada no momento.");
        } else {
            this.pecas.forEach(p => console.log(`   - ${p.nome} [Status: ${p.status}]`));
        }

        console.log(`\n🛠️  ETAPAS DE PRODUCAO (${this.etapas.length}):`);
        if (this.etapas.length === 0) {
            console.log("   Nenhuma etapa registrada.");
        } else {
            this.etapas.forEach(e => console.log(`   - ${e.nome} [Status: ${e.status}]`));
        }

        console.log(`\n✅ TESTES REALIZADOS (${this.testes.length}):`);
        if (this.testes.length === 0) {
            console.log("   Nenhum teste executado.");
        } else {
            this.testes.forEach(t => console.log(`   - Teste ${t.tipo} [Resultado: ${t.resultado}]`));
        }
        console.log(`==========================================\n`);
    }

    salvar(): void {
        const data = `${this.codigo};${this.modelo};${this.tipo};${this.capacidade};${this.alcance}\n`;
        fs.appendFileSync('./data/aeronaves.txt', data, 'utf8');
    }
}