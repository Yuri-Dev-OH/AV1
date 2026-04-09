import { StatusEtapa } from '../enums/Enums';
import { Funcionario } from './Funcionario';

export class Etapa {
    public funcionarios: Funcionario[] = [];

    constructor(
        public nome: string,
        public prazo: string,
        public status: StatusEtapa = StatusEtapa.PENDENTE
    ) {}

    iniciar(): void {
        this.status = StatusEtapa.ANDAMENTO; // [cite: 104]
    }

    finalizar(): void {
        this.status = StatusEtapa.CONCLUIDA; // [cite: 104]
    }

    adicionarFuncionario(funcionario: Funcionario): void {
        if (!this.funcionarios.find(f => f.id === funcionario.id)) {
            this.funcionarios.push(funcionario); // Evita duplicidade [cite: 111]
        }
    }

    listarFuncionarios(): Funcionario[] {
        return this.funcionarios; // [cite: 111]
    }
}