const cnpj = "18236120000158"; // Nubank

async function test() {
  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
  console.log("Status:", response.status);
  const text = await response.text();
  console.log("Body:", text);
}

test();
