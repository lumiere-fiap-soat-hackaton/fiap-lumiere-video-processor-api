# FIAP Lumiere Video Processor API

<div align="center">

![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white)
![Jest](https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

**API robusta para processamento de vídeos com upload/download seguro via AWS S3**

[Documentação](#-documentação) •
[Instalação](#-instalação) •
[Uso](#-uso) •
[Arquitetura](#%EF%B8%8F-arquitetura) •
[Testes](#-testes)

</div>

## 📋 Descrição

A **FIAP Lumiere Video Processor API** é uma solução moderna e escalável para processamento de vídeos, permitindo upload e download seguro de arquivos através de URLs assinadas do Amazon S3. Construída com **NestJS** e seguindo princípios de **Clean Architecture**, **CQRS** e **Domain-Driven Design**.

### ✨ Principais Funcionalidades

- 🔐 **URLs Assinadas Seguras**: Geração de URLs temporárias para upload/download
- 📹 **Suporte Multi-formato**: MP4, AVI, MOV, MKV
- 🏗️ **Arquitetura Limpa**: Clean Architecture com separação clara de responsabilidades
- ⚡ **CQRS Pattern**: Separação entre comandos e consultas
- 🧪 **Testes BDD**: Estrutura Given/When/Then para cenários claros
- 📊 **Logging Estruturado**: Monitoramento com Pino
- 🐳 **Docker Ready**: Container otimizado para produção
- 📖 **Swagger/OpenAPI**: Documentação interativa da API

## 🚀 Quick Start

### Pré-requisitos

- **Node.js** 20.x ou superior
- **npm** ou **yarn**
- **AWS S3** configurado
- **Docker** (opcional)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/brunoandradedev/fiap-lumiere-video-processor-api.git
cd fiap-lumiere-video-processor-api

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Execute em modo desenvolvimento
npm run start:dev
```

### Configuração Rápida

```bash
# Build da aplicação
npm run build

# Executar em produção
npm run start

# Executar com Docker
docker build -t video-processor-api .
docker run -p 3000:3000 video-processor-api
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```env
# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=your-bucket-name

# URL Expiration (in seconds)
DEFAULT_URL_EXPIRATION=300
```

## 🌐 Uso

### Endpoints Principais

A API estará disponível em `http://localhost:3000/api/v1`

#### 📤 Upload de Vídeo

```http
POST /api/v1/videos/upload-url
Content-Type: application/json

[
  {
    "fileName": "meu-video.mp4",
    "contentType": "video/mp4"
  }
]
```

**Resposta:**
```json
[
  {
    "fileName": "meu-video.mp4",
    "signedUrl": "https://s3.amazonaws.com/bucket/videos/meu-video.mp4?X-Amz-..."
  }
]
```

#### 📥 Download de Vídeo

```http
POST /api/v1/videos/download-url
Content-Type: application/json

{
  "fileName": "meu-video.mp4"
}
```

**Resposta:**
```json
{
  "signedUrl": "https://s3.amazonaws.com/bucket/videos/meu-video.mp4?X-Amz-..."
}
```

### 📖 Documentação Interativa

Acesse a documentação Swagger em: `http://localhost:3000/docs`

## 🏗️ Arquitetura

### Estrutura do Projeto

```
src/
├── app.module.ts                 # Módulo principal
├── main.ts                       # Bootstrap da aplicação
├── common/                       # Componentes compartilhados
│   ├── domain/entities/          # Entidades base
│   ├── exceptions/               # Exceções customizadas
│   ├── filters/                  # Filtros globais
│   └── services/                 # Serviços compartilhados
├── configuration/                # Configurações
│   ├── configuration.module.ts
│   └── configuration.ts
└── video-processing/             # Módulo de processamento de vídeo
    ├── api/                      # Camada de apresentação
    │   ├── controllers/          # Controllers REST
    │   └── dtos/                 # Data Transfer Objects
    ├── application/              # Camada de aplicação
    │   ├── services/             # Interfaces de serviços
    │   └── use-cases/            # Casos de uso (CQRS)
    ├── domain/                   # Camada de domínio
    │   └── entities/             # Entidades de negócio
    ├── infrastructure/           # Camada de infraestrutura
    │   └── s3-storage/           # Implementação S3
    └── __tests__/                # Testes organizados por camada
```

### Princípios Arquiteturais

- **🏛️ Clean Architecture**: Separação clara entre camadas
- **🔄 CQRS**: Separação entre comandos e consultas
- **🎯 DDD**: Modelagem baseada no domínio
- **🔌 Dependency Inversion**: Interfaces para baixo acoplamento
- **📦 Single Responsibility**: Cada classe tem uma responsabilidade

## 🧪 Testes

### Executar Testes

```bash
# Testes unitários
npm run test

# Testes com watch mode
npm run test:watch

# Cobertura de testes
npm run test:cov

# Testes específicos
npm test -- video.controller.spec.ts
```

### Estrutura BDD

Os testes seguem a estrutura **Given/When/Then**:

```typescript
describe('Given a user wants to upload video files', () => {
  describe('When requesting signed upload URLs for a single file', () => {
    it('Then should return a valid signed upload URL', async () => {
      // Given - Configuração do cenário
      // When - Ação sendo testada
      // Then - Verificação do resultado
    });
  });
});
```

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento
npm run start:dev          # Modo desenvolvimento com watch
npm run start:debug        # Modo debug

# Build e Produção
npm run build              # Build da aplicação
npm run start              # Executar em produção

# Qualidade de Código
npm run lint               # ESLint check e fix
npm run format             # Prettier formatting
npm run test               # Executar testes
npm run test:cov           # Cobertura de testes
```

## 🐳 Docker

### Build Local

```bash
# Build da imagem
docker build -t fiap-video-processor .

# Executar container
docker run -d \
  --name video-processor \
  -p 3000:3000 \
  --env-file .env \
  fiap-video-processor
```

### Docker Compose

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env
```

<div align="center">

**Desenvolvido com ❤️ para FIAP**

[⬆ Voltar ao topo](#fiap-lumiere-video-processor-api)

</div>