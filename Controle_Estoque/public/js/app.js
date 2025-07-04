// Estrutura de dados
let dados = {
    usuarios: {
        "admin": {
            senha: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", // sha256 de "admin123"
            nivelAcesso: "admin",
            criadoEm: new Date().toISOString()
        }
    },
    estoque: {},
    historico: []
};

// Variáveis globais
let usuarioAtual = null;
let ordenacao = { campo: 'produto', ordem: 'asc' };

// Funções de autenticação
function mostrarLogin() {
    document.getElementById('loginView').style.display = 'block';
    document.getElementById('cadastroView').style.display = 'none';
    document.getElementById('loginErro').textContent = '';
}

function mostrarCadastro() {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('cadastroView').style.display = 'block';
    document.getElementById('cadastroErro').textContent = '';
}

function fazerLogin() {
    const usuario = document.getElementById('usuarioLogin').value.trim();
    const senhaDigitada = document.getElementById('senhaLogin').value.trim();
    const senhaHash = sha256(senhaDigitada);
    
    console.log('Usuário digitado:', usuario);
    console.log('Senha digitada:', senhaDigitada);
    console.log('Hash gerado:', senhaHash);
    console.log('Hash armazenado:', dados.usuarios[usuario]?.senha);
    
    if (dados.usuarios[usuario] && dados.usuarios[usuario].senha === senhaHash) {
        // Login bem-sucedido
        usuarioAtual = {
            nome: usuario,
            nivelAcesso: dados.usuarios[usuario].nivelAcesso
        };
        
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        document.getElementById('currentUser').textContent = usuario;
        document.getElementById('userRole').textContent = usuarioAtual.nivelAcesso;
        
        ajustarPermissoes();
        atualizarTabela();
        atualizarHistorico();
    } else {
        console.error('Falha no login - Comparação:', {
            usuarioExiste: !!dados.usuarios[usuario],
            hashCorrespondente: dados.usuarios[usuario]?.senha === senhaHash
        });
        document.getElementById('loginErro').textContent = 'Usuário ou senha inválidos.';
    }
}

function cadastrarUsuario() {
    const usuario = document.getElementById('usuarioCadastro').value.trim();
    const senha = document.getElementById('senhaCadastro').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;
    const nivelAcesso = document.getElementById('nivelAcesso').value;
    
    if (!usuario || !senha || !confirmarSenha) {
        document.getElementById('cadastroErro').textContent = 'Preencha todos os campos.';
        return;
    }
    
    if (senha !== confirmarSenha) {
        document.getElementById('cadastroErro').textContent = 'As senhas não coincidem.';
        return;
    }
    
    if (senha.length < 6) {
        document.getElementById('cadastroErro').textContent = 'A senha deve ter pelo menos 6 caracteres.';
        return;
    }
    
    if (dados.usuarios[usuario]) {
        document.getElementById('cadastroErro').textContent = 'Usuário já existe.';
        return;
    }
    
    dados.usuarios[usuario] = {
        senha: sha256(senha),
        nivelAcesso: nivelAcesso,
        criadoEm: new Date().toISOString()
    };
    
    salvarDados();
    mostrarMensagem('Usuário cadastrado com sucesso!', 'sucesso');
    mostrarLogin();
}

function ajustarPermissoes() {
    const exportBtn = document.getElementById('exportBtn');
    
    if (usuarioAtual.nivelAcesso === 'operador') {
        exportBtn.style.display = 'none';
    } else {
        exportBtn.style.display = 'inline-block';
    }
}

function fazerLogout() {
    usuarioAtual = null;
    document.getElementById('authContainer').style.display = 'block';
    document.getElementById('app').style.display = 'none';
    document.getElementById('usuarioLogin').value = '';
    document.getElementById('senhaLogin').value = '';
    document.getElementById('loginErro').textContent = '';
    mostrarLogin();
}

// Funções de estoque
function registrar() {
    if (!usuarioAtual) return;
    
    const produto = document.getElementById('produto').value.trim();
    const categoria = document.getElementById('categoria').value.trim() || 'Sem categoria';
    const tipo = parseInt(document.getElementById('tipo').value);
    const quantidade = parseInt(document.getElementById('quantidade').value);
    
    if (!produto || isNaN(quantidade) || quantidade <= 0) {
        mostrarMensagem('Preencha todos os campos corretamente.', 'erro');
        return;
    }

    if (!dados.estoque[produto]) {
        dados.estoque[produto] = {
            quantidade: 0,
            categoria: categoria
        };
    }

    const movimento = {
        produto: produto,
        tipo: tipo === 1 ? 'Entrada' : 'Saída',
        quantidade: quantidade,
        data: new Date().toISOString(),
        usuario: usuarioAtual.nome,
        saldoAnterior: dados.estoque[produto].quantidade
    };

    if (tipo === 1) {
        dados.estoque[produto].quantidade += quantidade;
        movimento.saldoAtual = dados.estoque[produto].quantidade;
        mostrarMensagem(`Entrada de ${quantidade} unidades de ${produto}. Saldo atual: ${dados.estoque[produto].quantidade}`, 'sucesso');
    } else {
        if (dados.estoque[produto].quantidade >= quantidade) {
            dados.estoque[produto].quantidade -= quantidade;
            movimento.saldoAtual = dados.estoque[produto].quantidade;
            mostrarMensagem(`Saída de ${quantidade} unidades de ${produto}. Saldo atual: ${dados.estoque[produto].quantidade}`, 'sucesso');
        } else {
            mostrarMensagem(`Saldo insuficiente de ${produto}. Saldo atual: ${dados.estoque[produto].quantidade}`, 'erro');
            return;
        }
    }

    if (categoria !== 'Sem categoria') {
        dados.estoque[produto].categoria = categoria;
    }

    dados.historico.unshift(movimento);
    
    document.getElementById('produto').value = '';
    document.getElementById('quantidade').value = '';
    document.getElementById('produto').focus();
    
    salvarDados();
    atualizarTabela();
    atualizarHistorico();
}

function removerProduto(produto) {
    if (usuarioAtual.nivelAcesso !== 'gerente' && usuarioAtual.nivelAcesso !== 'admin') {
        mostrarMensagem('Você não tem permissão para remover produtos.', 'erro');
        return;
    }
    
    if (confirm(`Deseja remover completamente "${produto}" do estoque?`)) {
        dados.historico.unshift({
            produto: produto,
            tipo: 'Remoção',
            quantidade: dados.estoque[produto].quantidade,
            data: new Date().toISOString(),
            usuario: usuarioAtual.nome,
            saldoAnterior: dados.estoque[produto].quantidade,
            saldoAtual: 0
        });
        
        delete dados.estoque[produto];
        salvarDados();
        atualizarTabela();
        atualizarHistorico();
        mostrarMensagem(`Produto "${produto}" removido com sucesso.`, 'sucesso');
    }
}

function mostrarMensagem(texto, tipo) {
    const mensagem = document.getElementById('mensagem');
    mensagem.textContent = texto;
    mensagem.className = `mensagem mensagem-${tipo}`;
    
    setTimeout(() => {
        mensagem.textContent = '';
        mensagem.className = 'mensagem';
    }, 5000);
}

// Funções de tabela
function atualizarTabela() {
    const tabela = document.getElementById('tabelaEstoque').getElementsByTagName('tbody')[0];
    tabela.innerHTML = '';

    const produtosOrdenados = Object.keys(dados.estoque).sort((a, b) => {
        const campoA = ordenacao.campo === 'produto' ? a : dados.estoque[a][ordenacao.campo];
        const campoB = ordenacao.campo === 'produto' ? b : dados.estoque[b][ordenacao.campo];
        
        if (campoA < campoB) return ordenacao.ordem === 'asc' ? -1 : 1;
        if (campoA > campoB) return ordenacao.ordem === 'asc' ? 1 : -1;
        return 0;
    });

    produtosOrdenados.forEach(produto => {
        const row = tabela.insertRow();
        row.insertCell(0).textContent = produto;
        row.insertCell(1).textContent = dados.estoque[produto].categoria;
        row.insertCell(2).textContent = dados.estoque[produto].quantidade;
        
        const actionsCell = row.insertCell(3);
        
        if (usuarioAtual.nivelAcesso === 'gerente' || usuarioAtual.nivelAcesso === 'admin') {
            actionsCell.innerHTML = `
                <button class="action-btn delete-btn" onclick="removerProduto('${produto}')">Remover</button>
            `;
        }
    });

    document.getElementById('totalItens').textContent = `(${produtosOrdenados.length} itens)`;
}

function ordenarPor(campo) {
    if (ordenacao.campo === campo) {
        ordenacao.ordem = ordenacao.ordem === 'asc' ? 'desc' : 'asc';
    } else {
        ordenacao.campo = campo;
        ordenacao.ordem = 'asc';
    }
    atualizarTabela();
}

// Funções de histórico
function atualizarHistorico() {
    const tabela = document.getElementById('tabelaHistorico').getElementsByTagName('tbody')[0];
    tabela.innerHTML = '';

    const historicoLimitado = dados.historico.slice(0, 50);
    
    historicoLimitado.forEach(mov => {
        const row = tabela.insertRow();
        
        const data = new Date(mov.data);
        row.insertCell(0).textContent = data.toLocaleString();
        row.insertCell(1).textContent = mov.usuario;
        row.insertCell(2).textContent = mov.produto;
        row.insertCell(3).textContent = mov.tipo;
        row.insertCell(4).textContent = mov.quantidade;
        row.insertCell(5).textContent = mov.saldoAtual !== undefined ? mov.saldoAtual : mov.saldoAnterior;
        
        if (mov.tipo === 'Entrada') row.classList.add('entrada-row');
        if (mov.tipo === 'Saída') row.classList.add('saida-row');
        if (mov.tipo === 'Remoção') row.classList.add('remocao-row');
    });
}

// Funções de exportação
function exportarCSV() {
    if (usuarioAtual.nivelAcesso !== 'gerente' && usuarioAtual.nivelAcesso !== 'admin') {
        mostrarMensagem('Você não tem permissão para exportar dados.', 'erro');
        return;
    }
    
    let csv = 'Produto,Categoria,Quantidade\n';
    
    Object.keys(dados.estoque).forEach(produto => {
        csv += `"${produto}","${dados.estoque[produto].categoria}",${dados.estoque[produto].quantidade}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `estoque_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    
    mostrarMensagem('Exportação para CSV concluída com sucesso.', 'sucesso');
}

// Funções de persistência
function carregarDados() {
    const dadosSalvos = localStorage.getItem('sistemaEstoque');
    if (dadosSalvos) {
        dados = JSON.parse(dadosSalvos);
    }
}

function salvarDados() {
    localStorage.setItem('sistemaEstoque', JSON.stringify(dados));
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Garante que o admin existe com a senha correta
    if (!dados.usuarios.admin) {
        dados.usuarios.admin = {
            senha: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", // hash de "admin123"
            nivelAcesso: "admin",
            criadoEm: new Date().toISOString()
        };
        salvarDados();
    }
    
    carregarDados(); // Carrega outros dados existentes
    
    // Validações
    document.getElementById('quantidade').addEventListener('input', validarQuantidade);
    document.getElementById('produto').addEventListener('input', validarProduto);
});

function validarQuantidade() {
    const input = document.getElementById('quantidade');
    if (input.value < 1) {
        input.setCustomValidity('A quantidade deve ser maior que zero.');
    } else {
        input.setCustomValidity('');
    }
}

function validarProduto() {
    const input = document.getElementById('produto');
    if (input.value.trim().length === 0) {
        input.setCustomValidity('O nome do produto é obrigatório.');
    } else {
        input.setCustomValidity('');
    }
    // Adicione isto no final de app.js
document.addEventListener('DOMContentLoaded', function() {
    // Seu código de inicialização aqui
});
}