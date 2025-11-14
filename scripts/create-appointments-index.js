#!/usr/bin/env node

// Script para criar (uma vez) o índice composto necessário na coleção "appointments".
// Usa Google Cloud / Firestore Admin API via google-auth-library.
// Requisitos:
// - Variável de ambiente FIREBASE_PROJECT_ID (ou GCLOUD_PROJECT / GOOGLE_CLOUD_PROJECT).
// - Credenciais de service account configuradas (GOOGLE_APPLICATION_CREDENTIALS ou ADC).
// - Dependência: npm install google-auth-library

const { GoogleAuth } = require('google-auth-library');

const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';

async function main() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT;

  if (!projectId) {
    console.error(
      'Defina a variável de ambiente FIREBASE_PROJECT_ID (ou GCLOUD_PROJECT/GOOGLE_CLOUD_PROJECT) antes de rodar este script.',
    );
    process.exit(1);
  }

  console.log(`Usando projeto: ${projectId}`);

  const auth = new GoogleAuth({ scopes: [FIRESTORE_SCOPE] });
  const client = await auth.getClient();

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/indexes`;

  const body = {
    collectionGroup: 'appointments',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'receiverId', order: 'ASCENDING' },
      { fieldPath: 'date', order: 'ASCENDING' },
      // Campo interno recomendado pelo console
      { fieldPath: '__name__', order: 'ASCENDING' },
    ],
  };

  console.log('Criando índice composto para collectionGroup "appointments" (receiverId + date)...');

  try {
    const response = await client.request({
      url,
      method: 'POST',
      data: body,
    });

    console.log('Solicitação enviada com sucesso. Resposta da API:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log(
      'O índice entrará em estado BUILDING e depois ficará pronto (READY). Verifique no console do Firestore se quiser acompanhar.',
    );
  } catch (error) {
    const status = error?.response?.data?.error?.status;

    if (status === 'ALREADY_EXISTS') {
      console.log('O índice já existe. Nada a fazer.');
      process.exit(0);
    }

    console.error('Falha ao criar índice na Firestore Admin API.');
    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Erro inesperado ao executar o script:', error);
  process.exit(1);
});
