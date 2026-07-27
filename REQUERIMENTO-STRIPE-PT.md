# Como criar a sua conta Stripe (passo a passo, simples)

Olá 👋 Isto serve para configurar os pagamentos da página. Foi escrito para
fazer **sem precisar de saber de tecnologia**. São duas fases: primeiro uma
**rápida** (para começarmos a montar tudo) e depois a de **ativação** (quando
já quiser receber dinheiro a sério).

> Vídeo de apoio (em português): https://www.youtube.com/watch?v=cQc4AaxAuus
> Ajuda oficial da Stripe (em português): https://docs.stripe.com/get-started/account/set-up

---

## FASE 1 — Criar a conta (rápido, ~10 minutos)

Isto **não** cobra nada nem precisa do seu banco ainda. Serve para o
programador poder montar os pagamentos em modo de teste.

1. Vá a **https://dashboard.stripe.com/register**
2. Escreva o seu **email**, o seu **nome** e uma **palavra-passe**. Continue.
3. **País da conta**: escolha **Portugal**. (Importante: assim ficam
   disponíveis os pagamentos portugueses como o Multibanco e o MB Way.)
4. Vá ao seu email e **confirme** o endereço (a Stripe envia-lhe um link).
5. Ative a **verificação em dois passos (2FA)** se lhe pedirem — é por
   segurança, faz-se com o telemóvel.

### O que tem de me enviar (só isto)

6. Dentro da Stripe, em cima, confirme que está no **modo de Teste**
   (há um interruptor "Test mode").
7. Vá ao menu **Programadores** (Developers) → **Chaves de API** (API keys).
8. Vai ver uma **"Chave secreta" (Secret key)** que começa por
   **`sk_test_...`**. Carregue em **Revelar** e **copie** essa chave.
9. Envie-me essa chave. **Só a de teste (`sk_test_...`)**. Com isso já monto
   os pagamentos.

> ⚠️ Segurança: a chave que começa por `sk_test_` é de teste e **não move
> dinheiro real**. **Nunca** partilhe a chave que começa por `sk_live_`
> (essa é a real) por chat ou email aberto — essa colocamos juntos e em
> privado quando passarmos a cobranças a sério.

---

## FASE 2 — Ativar para receber dinheiro (quando estiverem prontos)

Isto faz-se **depois**, quando já quiserem receber pagamentos reais. Tenha à
mão:

- **NIF** (número de contribuinte).
- **IBAN** da sua conta bancária (é para onde vai o dinheiro das consultas).
- **Documento de identificação**, morada e telefone.

Passos:

1. Na Stripe, carregue em **"Ativar a conta"** (Activate account).
2. Preencha os dados do negócio e pessoais que lhe pedirem.
3. Adicione o seu **IBAN** para receber os pagamentos.
4. Envie a verificação de identidade, se for pedida.

Quando estiver ativada, envia-me (em privado) a chave **`sk_live_...`** e
mudamos de modo de teste para real. **Não muda nada na página**, só essa chave.

---

## Resumo do que me envia

| Quando | O quê | Para quê |
| ------ | ----- | -------- |
| Agora (Fase 1) | A chave **`sk_test_...`** | Montar os pagamentos em modo de teste |
| Ao passar a produção (Fase 2) | A chave **`sk_live_...`** (em privado) | Cobranças reais |

Qualquer dúvida num passo, envie uma captura de ecrã e ajudo-a.
