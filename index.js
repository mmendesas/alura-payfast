var app = require('./config/custom-express')();

app.listen(3300, function () {
    console.log('Servidor rodando na porta 3300');
});