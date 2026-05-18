Onboarding:
POST /auth/wallet Wallet login / register
Corpo:
{
  "stellarAddress": "GBT6H7C4YX6K25FRTAYWSEVSHX77WBSVO3AQD7QWLN234CFTE2HQB34A",
  "label": "Teste do Mestre"
}
Retorno:
{
  "user": {
    "id": "cmp8qxczf005vp32ne8c16oam",
    "name": null,
    "email": null,
    "avatarUrl": null,
    "createdAt": "2026-05-16T19:35:24.411Z"
  },
  "wallet": {
    "id": "cmp8qxczj005xp32ndzru0tca",
    "stellarAddress": "GBT6H7C4YX6K25FRTAYWSEVSHX77WBSVO3AQD7QWLN234CFTE2HQB34A",
    "label": "Teste do Mestre",
    "isActive": true
  },
  "isNewUser": true
}

Próximo
POST /etherfuse/onboarding/organization
Create Etherfuse child organization for the user
Corpo:
{
  "userId": "cmp8qxczf005vp32ne8c16oam",
  "email": "testedomestre@email.com",
  "firstName": "Teste",
  "lastName": "Do Mestre"
}
Retorno:
{
  "id": "cmp8r05sc005zp32nclm0l73b",
  "userId": "cmp8qxczf005vp32ne8c16oam",
  "etherfuseOrgId": "a67861de-af62-452c-bd15-14a7dd9c2d26",
  "kycStatus": "NOT_STARTED",
  "createdAt": "2026-05-16T19:37:35.052Z",
  "updatedAt": "2026-05-16T19:37:35.052Z"
}

Próximo:
PATCH /users/{id}
Update user profile
Corpo:
{
  "name": "Teste do Mestre",
  "email": "testedomestre@email.com"
}
Retorno:
{
  "id": "cmp8qxczf005vp32ne8c16oam",
  "name": "Teste do Mestre",
  "email": "testedomestre@email.com",
  "avatarUrl": null,
  "isOnboarded": false,
  "createdAt": "2026-05-16T19:35:24.411Z",
  "updatedAt": "2026-05-16T19:39:29.398Z"
}

Próximo:
POST /etherfuse/onboarding/presigned-url
Generate presigned URL for bank account onboarding
Corpo:
{
  "userId": "cmp8qxczf005vp32ne8c16oam",
  "pubkey": "GBT6H7C4YX6K25FRTAYWSEVSHX77WBSVO3AQD7QWLN234CFTE2HQB34A"
}
Retorno:
{
  "presignedUrl": "https://devnet.etherfuse.com/ramp/onboarding?org_id=c7e88361-5265-44f5-b58c-e9e4548c3948&customer_id=a67861de-af62-452c-bd15-14a7dd9c2d26&blockchain=stellar&public_key=GBT6H7C4YX6K25FRTAYWSEVSHX77WBSVO3AQD7QWLN234CFTE2HQB34A&renewed=false&bank_account_id=67d3b7e7-02c5-4a0c-9d83-b50fc4def2e6&timestamp=1778960450&expires_at=1778961350&signature=%2BZCcBtCENOiAwMKWr%2BD%2FcEg7F%2FDUjrCLP06emNBhwh0%3D",
  "bankAccountId": "67d3b7e7-02c5-4a0c-9d83-b50fc4def2e6"
}

Fui no site tentei fazer Kyc pelo site e essa bosta de site não tem como cadastrar...

POST /wallets/trustline/xdr
Generate USDC trustline XDR
Corpo:
{
  "stellarAddress": "GBT6H7C4YX6K25FRTAYWSEVSHX77WBSVO3AQD7QWLN234CFTE2HQB34A"
}
Retorno:
{
  "unsignedXdr": "AAAAAgAAAABn4/xcxfytdLGYMWkSsj3/+wZVdsEB/hZbdb4IsyaPAAAAAGQAD1CpAAAADAAAAAEAAAAAAAAAAAAAAABqCMw9AAAAAAAAAAEAAAAAAAAABgAAAAFVU0RDAAAAAEI+fQXy7K+/7BkrIVo/G+lq7bjY5wJUq+NBPgIH3layf/////////8AAAAAAAAAAA==",
  "asset": "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
}

POST /etherfuse/quote
Get a conversion quote (onramp or offramp)
Corpo:
{
  "userId": "cmp8qxczf005vp32ne8c16oam",
  "direction": "onramp",
  "sourceAsset": "BRL",
  "targetAsset": "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  "sourceAmount": "100",
  "walletAddress": "GBT6H7C4YX6K25FRTAYWSEVSHX77WBSVO3AQD7QWLN234CFTE2HQB34A"
}
retorno:
{
  "quoteId": "b4ebd78e-9b09-4e86-9f7a-342eb18cd2d1",
  "blockchain": "stellar",
  "quoteAssets": {
    "type": "onramp",
    "sourceAsset": "BRL",
    "targetAsset": "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
  },
  "sourceAmount": "100",
  "destinationAmount": "19.682088904666114463771545770",
  "createdAt": "2026-05-16T19:49:05.230021737Z",
  "updatedAt": "2026-05-16T19:49:05.230021737Z",
  "expiresAt": "2026-05-16T19:51:05.231042499Z",
  "exchangeRate": "0.1968208890466611446377154577",
  "etherfuseMidMarketRate": "0.197215319686033211059835128",
  "feeBps": "20",
  "feeAmount": "0.20",
  "requiresSwap": true
}

POST /etherfuse/onramp
Create an on-ramp order (fiat → crypto on Stellar)
Corpo:
{
  "userId": "cmp8qxczf005vp32ne8c16oam",
  "bankAccountId": "67d3b7e7-02c5-4a0c-9d83-b50fc4def2e6",
  "quoteId": "b4ebd78e-9b09-4e86-9f7a-342eb18cd2d1",
  "walletAddress": "GBT6H7C4YX6K25FRTAYWSEVSHX77WBSVO3AQD7QWLN234CFTE2HQB34A",
  "sourceAsset": "BRL",
  "targetAsset": "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  "sourceAmount": "100",
  "destinationAmount": "19.682088904666114463771545770"
}
Retorno:
{
  "statusCode": 404,
  "timestamp": "2026-05-16T19:51:14.320Z",
  "path": "/etherfuse/onramp",
  "message": "Bank account not found"
}


AQUI O PROBLEMA EU ACHO QUE É NA CRIAÇÃO DA CONTA DENTRO DO SITE DA ETHERFUSE

NENHUM JEITO QUE EU TENTO CRIAR FUNCIONA, NEM POR APP DO PIGFI, NEM POR REQUEST DO SWAGGER NEM NADA....

Continuando com teste de async:
POST /etherfuse/onboarding/bank-accounts/sync
Sync bank accounts from Etherfuse into local DB
Corpo:
{
  "userId": "cmp8qxczf005vp32ne8c16oam"
}
Retorno:
[
  {
    "id": "cmp8rqoyt0061p32nnzr2qmvt",
    "customerId": "cmp8r05sc005zp32nclm0l73b",
    "etherfuseBankId": "67d3b7e7-02c5-4a0c-9d83-b50fc4def2e6",
    "clabe": "",
    "pixKey": null,
    "pixKeyType": null,
    "rail": "pix",
    "accountType": "personal",
    "isCompliant": true,
    "createdAt": "2026-05-16T19:58:12.966Z",
    "updatedAt": "2026-05-16T19:58:12.966Z"
  }
]
*salvou a linha no banco

Tentando onramp de novo:
POST /etherfuse/quote
Get a conversion quote (onramp or offramp)
Corpo:
{
  "userId": "cmp8qxczf005vp32ne8c16oam",
  "direction": "onramp",
  "sourceAsset": "BRL",
  "targetAsset": "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  "sourceAmount": "100",
  "walletAddress": "GBT6H7C4YX6K25FRTAYWSEVSHX77WBSVO3AQD7QWLN234CFTE2HQB34A"
}
Retorno:
{
  "quoteId": "79fe3ea5-dcd8-480b-a1fc-0fbfa857a1a9",
  "blockchain": "stellar",
  "quoteAssets": {
    "type": "onramp",
    "sourceAsset": "BRL",
    "targetAsset": "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
  },
  "sourceAmount": "100",
  "destinationAmount": "19.682088904666114463771545770",
  "createdAt": "2026-05-16T19:59:47.050741273Z",
  "updatedAt": "2026-05-16T19:59:47.050741273Z",
  "expiresAt": "2026-05-16T20:01:47.051769725Z",
  "exchangeRate": "0.1968208890466611446377154577",
  "etherfuseMidMarketRate": "0.197215319686033211059835128",
  "feeBps": "20",
  "feeAmount": "0.20",
  "requiresSwap": true
}
POST /etherfuse/onramp
Create an on-ramp order (fiat → crypto on Stellar)
Corpo:
{
  "userId": "cmp8qxczf005vp32ne8c16oam",
  "bankAccountId": "67d3b7e7-02c5-4a0c-9d83-b50fc4def2e6",
  "quoteId": "79fe3ea5-dcd8-480b-a1fc-0fbfa857a1a9",
  "walletAddress": "GBT6H7C4YX6K25FRTAYWSEVSHX77WBSVO3AQD7QWLN234CFTE2HQB34A",
  "sourceAsset": "BRL",
  "targetAsset": "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  "sourceAmount": "100",
  "destinationAmount": "19.682088904666114463771545770"
}
Retorno:
{
  "statusCode": 404,
  "timestamp": "2026-05-16T20:01:01.221Z",
  "path": "/etherfuse/onramp",
  "message": "Bank account not found"
}

Então acho que o processo está no site da etherfuse, não criou mesmo a conta... Mas estranho pois salvo a linha no banco no async poxa...
cmp8rqoyt0061p32nnzr2qmvt	cmp8r05sc005zp32nclm0l73b	67d3b7e7-02c5-4a0c-9d83-b50fc4def2e6		personal	true	2026-05-16 19:58:12.966	2026-05-16 19:58:12.966			pix