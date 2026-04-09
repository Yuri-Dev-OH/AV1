export enum TipoAeronave {
    COMERCIAL = "COMERCIAL",
    MILITAR = "MILITAR"
}

export enum TipoPeca {
    NACIONAL = "NACIONAL",
    IMPORTADA = "IMPORTADA"
}

export enum StatusPeca {
    EM_PRODUCAO = "EM_PRODUCAO",
    EM_TRANSPORTE = "EM_TRANSPORTE",
    PRONTA = "PRONTA"
}

export enum StatusEtapa {
    PENDENTE = "PENDENTE",
    ANDAMENTO = "ANDAMENTO",
    CONCLUIDA = "CONCLUIDA"
}

export enum NivelPermissao {
    ADMINISTRADOR = "ADMINISTRADOR",
    ENGENHEIRO = "ENGENHEIRO",
    OPERADOR = "OPERADOR"
}

export enum TipoTeste {
    ELETRICO = "ELETRICO",
    HIDRAULICO = "HIDRAULICO",
    AERODINAMICO = "AERODINAMICO"
}

export enum ResultadoTeste {
    APROVADO = "APROVADO",
    REPROVADO = "REPROVADO"
}