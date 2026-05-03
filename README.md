# HeartMe

<p align="center">
  <b>Uma aplicação web de rede social baseada em microserviços</b><br>
  Arquitetura moderna com Spring Boot, WebSocket e Nginx
</p>

---

## Visão geral

O **HeartMe** é uma aplicação web que simula funcionalidades de uma rede social, permitindo interação entre usuários por meio de publicações, curtidas e notificações em tempo real.

O projeto foi desenvolvido com foco na aplicação prática de conceitos modernos de engenharia de software, como arquitetura em microserviços, comunicação via APIs REST e uso de WebSockets.

---

## Demonstração

<p align="center">
  <b>Visão geral da aplicação</b>
</p>

<br>

<table align="center">
  <tr>
    <td align="center">
      <b>Tela de Pesquisa</b><br><br>
      <img src="https://github.com/user-attachments/assets/f47a2c8c-0680-4656-8707-05ae47d8f7c0" width="480"/>
    </td>
    <td align="center">
      <b>Tela de Login</b><br><br>
      <img src="https://github.com/user-attachments/assets/0c312b90-fb5e-490a-8d44-275134740165" width="480"/>
    </td>
  </tr>

  <tr>
    <td align="center">
      <b>Configuração e Personalização de Conta</b><br><br>
      <img src="https://github.com/user-attachments/assets/1801d8a3-b2f0-4e94-9baa-a3bb640d3e4b" width="480"/>
    </td>
    <td align="center">
      <b>Dashboard</b><br><br>
      <img src="https://github.com/user-attachments/assets/798596ae-10a6-42f6-a375-d0ded54c048d" width="480"/>
    </td>
  </tr>
</table>

---

## Funcionalidades

- Autenticação de usuários (cadastro e login)
- Criação e edição de perfil
- Publicação de posts com imagem
- Curtidas em posts
- Sistema de notificações em tempo real
- Interface web integrada via proxy reverso
- Estrutura baseada em microserviços independentes

---

## Tecnologias

### Back-end
- Java + Spring Boot
- Spring Security
- Spring Data JPA
- WebSocket (STOMP)
- Maven

### Front-end
- HTML, CSS, JavaScript

### Infraestrutura
- Docker
- Docker Compose
- Nginx
- PostgreSQL

---

## Fluxo do Usuário

O usuário pode:

Criar uma conta e fazer login
Configurar seu perfil (nome, bio, avatar)
Publicar conteúdo com imagem
Interagir com posts (curtidas)
Receber notificações em tempo real

---

## Conceitos aplicados
Arquitetura de microserviços
API REST
Comunicação em tempo real com WebSocket
Proxy reverso com Nginx
Containerização com Docker
Separação de responsabilidades

