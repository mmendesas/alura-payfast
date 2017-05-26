
module.exports = function (app) {

    app.get('/pagamentos', function (req, res) {
        console.log('Recebida requisição de teste.');
        res.send('OK');
    });

    // cancelar o pagamento
    app.delete('/pagamentos/pagamento/:id', function (req, res) {
        var pagamento = {};
        var id = req.params.id;

        pagamento.id = id;
        pagamento.status = 'CANCELADO';

        var connection = app.persistencia.connectionFactory();
        var pagamentoDao = new app.persistencia.PagamentoDao(connection);

        pagamentoDao.atualiza(pagamento, function (erro) {
            if (erro) {
                res.status(500).send(erro);
                return;
            }
            console.log('pagamento cancelado');
            res.status(204).send(pagamento);
        });

    });

    //confirma o pagamento
    app.put('/pagamentos/pagamento/:id', function (req, res) {

        var pagamento = {};
        var id = req.params.id;

        pagamento.id = id;
        pagamento.status = 'CONFIRMADO';

        var connection = app.persistencia.connectionFactory();
        var pagamentoDao = new app.persistencia.PagamentoDao(connection);

        pagamentoDao.atualiza(pagamento, function (erro) {
            if (erro) {
                res.status(500).send(erro);
                return;
            }
            console.log('pagamento confirmado');
            res.send(pagamento);
        });

    });

    //cria o pagamento
    app.post('/pagamentos/pagamento', function (req, res) {

        req.assert("pagamento.forma_de_pagamento", "Forma de pagamento eh obrigatorio").notEmpty();
        req.assert("pagamento.valor", "Valor eh obrigatorio e deve ser um decimal").notEmpty().isFloat();
        req.assert("pagamento.moeda", "Moeda é obrigatória e deve ter 3 caracteres").notEmpty().len(3, 3);

        var erros = req.validationErrors();

        if (erros) {
            console.log('Erros de validacao encontrados');
            res.status(400).send(erros);
            return;
        }

        var body = req.body;
        var pagamento = body['pagamento'];
        console.log('processando uma requisicao de um novo pagamento');

        pagamento.status = 'CRIADO';
        pagamento.data = new Date;

        var connection = app.persistencia.connectionFactory();
        var pagamentoDao = new app.persistencia.PagamentoDao(connection);

        pagamentoDao.salva(pagamento, function (erro, resultado) {

            if (erro) {
                console.log('Erro ao inserir no banco: ' + erro);
                res.status(500).send(erro);
            } else {
                pagamento.id = resultado.insertId;
                console.log('pagamento criado');

                if (pagamento.forma_de_pagamento == 'cartao') {
                    var cartao = body["cartao"];
                    console.log(cartao);

                    var clienteCartoes = new app.servicos.clienteCartoes;
                    clienteCartoes.autoriza(cartao,
                        function (exception, request, response, retorno) {

                            if (exception) {
                                console.log(exception);
                                res.status(400).send(exception);
                                return
                            }                            
                            
                            res.location('/pagamentos/pagamento/' + pagamento.id);
                            var response = {
                                cartao: retorno,
                                dados_do_pagamento: pagamento,
                                links: [
                                    {
                                        href: "http://localhost:3300/pagamentos/pagamento/" + pagamento.id,
                                        rel: "confirmar",
                                        method: "PUT"
                                    },
                                    {
                                        href: "http://localhost:3300/pagamentos/pagamento/" + pagamento.id,
                                        rel: "cancelar",
                                        method: "DELETE"
                                    }
                                ]
                            }
                            res.status(201).json(response);


                        });
                } else {
                    res.location('/pagamentos/pagamento/' + pagamento.id);
                    var response = {
                        dados_do_pagamento: pagamento,
                        links: [
                            {
                                href: "http://localhost:3300/pagamentos/pagamento/" + pagamento.id,
                                rel: "confirmar",
                                method: "PUT"
                            },
                            {
                                href: "http://localhost:3300/pagamentos/pagamento/" + pagamento.id,
                                rel: "cancelar",
                                method: "DELETE"
                            }
                        ]
                    }
                    res.status(201).json(response);
                }
            }
        });

    });
}