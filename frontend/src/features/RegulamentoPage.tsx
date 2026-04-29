import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft, ShieldCheck, CheckSquare, Clock } from 'lucide-react';
import { Card, CardContent, CardTitle, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';

const RegulamentoPage = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white border-b sticky top-0 z-10 shadow-sm py-4">
                <div className="container mx-auto px-4 flex items-center h-10">
                    <Link to="/">
                        <Button variant="ghost" size="sm" className="hidden sm:flex">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar
                        </Button>
                    </Link>
                    <div className="flex-1 flex justify-center items-center gap-2">
                        <FileText className="h-6 w-6 text-green-600" />
                        <h1 className="text-xl font-bold tracking-tight text-slate-800">
                            Regulamento Fidelidade
                        </h1>
                    </div>
                    <div className="w-20 hidden sm:block"></div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Card>
                        <CardHeader className="bg-slate-50 border-b pb-6">
                            <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                Termos e Condições do Programa
                            </CardTitle>
                            <p className="text-slate-500 text-sm mt-1">
                                Última atualização: {new Date().toLocaleDateString('pt-BR')}
                            </p>
                        </CardHeader>
                        <CardContent className="pt-6 text-slate-700 leading-relaxed space-y-8">
                            
                            <section>
                                <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <CheckSquare className="h-5 w-5 text-green-600" />
                                    1. Participação e Cadastro
                                </h3>
                                <div className="space-y-4 text-justify">
                                    <p>
                                        O presente regulamento estabelece as regras e condições para participação 
                                        no Programa de Fidelidade da Empresa ("Programa"). A participação é opcional, 
                                        gratuita e aberta a todas as pessoas físicas, maiores de 18 anos, residentes 
                                        e domiciliadas no Brasil, que possuam um número de CPF válido.
                                    </p>
                                    <p>
                                        O cadastro no Programa pressupõe a leitura, compreensão e aceitação 
                                        integral deste regulamento, bem como da nossa Política de Privacidade.
                                    </p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-green-600" />
                                    2. Acúmulo de Pontos e Privacidade
                                </h3>
                                <div className="space-y-4 text-justify pl-4 border-l-2 border-slate-100">
                                    <p>
                                        A cada compra realizada, o cliente participante poderá acumular pontos, 
                                        sendo a proporção de conversão e o valor correspondente a cada ponto 
                                        definidos pela Empresa e comunicados de forma clara nos materiais promocionais.
                                    </p>
                                    <p>
                                        Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), 
                                        informamos que os dados pessoais coletados durante o cadastro e as 
                                        transações serão utilizados exclusivamente para a gestão e operacionalização 
                                        do Programa de Fidelidade, comunicação institucional e direcionamento de ofertas.
                                    </p>
                                    <p>
                                        Ao aceitar este regulamento, o cliente consente de forma expressa, livre e 
                                        inequívoca com a coleta, uso, armazenamento e tratamento de seus dados 
                                        pessoais nas condições estabelecidas neste documento.
                                    </p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-green-600" />
                                    3. Resgate e Validade dos Pontos
                                </h3>
                                <div className="space-y-4 text-justify">
                                    <p>
                                        Os pontos acumulados podem ser trocados ou convertidos em descontos, 
                                        produtos, serviços ou benefícios, conforme o catálogo de prêmios vigente e 
                                        disponível no momento do resgate.
                                    </p>
                                    <p>
                                        Os pontos não possuem valor monetário e não podem ser trocados por 
                                        dinheiro ou transferidos para terceiros sob nenhuma circunstância.
                                    </p>
                                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-900 font-medium flex gap-3">
                                        <Clock className="h-6 w-6 text-amber-600 shrink-0" />
                                        <span>
                                            Atenção: Os pontos terão validade de 12 (doze) meses contados a partir da 
                                            data do crédito no extrato do participante.
                                        </span>
                                    </div>
                                    <p>
                                        A Empresa reserva-se o direito de, a qualquer momento e a seu critério 
                                        exclusivo, alterar, suspender ou cancelar o Programa, ou modificar as regras 
                                        e condições do presente regulamento, mediante comunicação prévia aos participantes.
                                    </p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">
                                    4. Do Direito de Cancelamento
                                </h3>
                                <p className="text-justify">
                                    O participante poderá, a qualquer tempo, solicitar o cancelamento da sua inscrição no Programa de Fidelidade e a exclusão dos seus dados pessoais dos nossos registros. Tal solicitação acarretará a perda imediata de todos os pontos acumulados e não resgatados até aquele momento.
                                </p>
                            </section>
                        </CardContent>
                    </Card>

                    <div className="flex justify-center pb-8 pt-4">
                        <Link to="/cadastro">
                            <Button size="lg" className="bg-green-600 hover:bg-green-700 font-bold px-8 shadow-md">
                                Li e aceito: Fazer meu cadastro
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RegulamentoPage;
