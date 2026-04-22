type PayuCheckoutFields = {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  curl?: string;
  hash: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
};

export function startPayuCheckout({
  paymentUrl,
  fields,
}: {
  paymentUrl: string;
  fields: PayuCheckoutFields;
}) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = paymentUrl;
  form.style.display = "none";

  for (const [name, rawValue] of Object.entries(fields)) {
    if (rawValue === undefined) continue;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = rawValue;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
  window.setTimeout(() => form.remove(), 0);
}
