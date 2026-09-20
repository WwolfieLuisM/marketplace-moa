async function cargarPartial(selector, ruta) {
  const el = document.querySelector(selector);
  if (!el) return;
  try {
    const res = await fetch(ruta);
    if (!res.ok) return;
    el.innerHTML = await res.text();
    el.dispatchEvent(new CustomEvent('partialloaded'));
  } catch (e) {}
}