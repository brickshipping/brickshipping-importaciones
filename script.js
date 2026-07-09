let catalogo = [];
let carrito = [];

const WHATSAPP_NUMBER = "569XXXXXXXX"; // Cambia esto por tu WhatsApp real

const PORCENTAJE_IMPORTACION = 0.25;
const ENVIO_GRATIS_DESDE = 99990;
const ENVIO_NACIONAL = 4490;

const buscador = document.getElementById("busqueda");
const resultado = document.getElementById("resultado");
const divCarrito = document.getElementById("items-carrito");
const filtroTema = document.getElementById("filtro-tema");
const orden = document.getElementById("orden");

const subtotalEl = document.getElementById("subtotal");
const importacionEl = document.getElementById("importacion");
const envioNacionalEl = document.getElementById("envio-nacional");
const totalEl = document.getElementById("total");
const btnSolicitar = document.getElementById("solicitar");

fetch("../data/catalogo_cliente.json")
    .then(response => response.json())
    .then(data => {
        catalogo = data;
        cargarTemas();
        render();
    })
    .catch(error => {
        console.error("Error cargando catálogo:", error);
        resultado.innerHTML = `<tr><td colspan="7">Error cargando catálogo.</td></tr>`;
    });

function limpiarTema(tema) {
    return String(tema || "").replace(/[^\p{L}\p{N}\s&-]/gu, "").trim();
}

function precioNumero(precio) {
    return Number(String(precio || "").replace("$", "").replaceAll(".", "").trim()) || 0;
}

function formatoPesos(valor) {
    return "$" + Math.round(valor).toLocaleString("es-CL");
}

function cargarTemas() {
    filtroTema.innerHTML = `<option value="">Todas las categorías</option>`;
    const temas = [...new Set(catalogo.map(p => limpiarTema(p.tema)))].sort();

    temas.forEach(t => {
        if (!t) return;
        const option = document.createElement("option");
        option.value = t;
        option.textContent = t;
        filtroTema.appendChild(option);
    });
}

function render() {
    const texto = buscador.value.toLowerCase().trim();
    const temaSeleccionado = filtroTema.value;

    let lista = catalogo.filter(p => {
        const producto = String(p.producto || "").toLowerCase();
        const codigo = String(p.codigo || "").toLowerCase();
        const tema = limpiarTema(p.tema).toLowerCase();

        return (
            (producto.includes(texto) || codigo.includes(texto) || tema.includes(texto)) &&
            (!temaSeleccionado || limpiarTema(p.tema) === temaSeleccionado)
        );
    });

    if (orden.value === "nombre") {
        lista.sort((a, b) => String(a.producto || "").localeCompare(String(b.producto || "")));
    }

    if (orden.value === "precio-menor") {
        lista.sort((a, b) => precioNumero(a.precio) - precioNumero(b.precio));
    }

    if (orden.value === "precio-mayor") {
        lista.sort((a, b) => precioNumero(b.precio) - precioNumero(a.precio));
    }

    mostrarProductos(lista);
}

function mostrarProductos(lista) {
    resultado.innerHTML = "";

    if (!lista || lista.length === 0) {
        resultado.innerHTML = `<tr><td colspan="7">No se encontraron productos.</td></tr>`;
        return;
    }

    lista.forEach(p => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>
                <img class="producto-img" src="${p.imagen || ""}" alt="${p.producto || ""}" onerror="this.style.display='none'">
            </td>
            <td>${limpiarTema(p.tema)}</td>
            <td>${p.codigo || ""}</td>
            <td>${p.producto || ""}</td>
            <td>${p.disponibilidad || "Disponible"}</td>
            <td class="precio">${p.precio || "$0"}</td>
            <td><button onclick="agregar('${p.id || p.codigo}')">Agregar</button></td>
        `;

        resultado.appendChild(tr);
    });
}

function agregar(idProducto) {
    const producto = catalogo.find(p => (p.id || p.codigo) === idProducto);
    if (!producto) return;

    const item = carrito.find(i => (i.id || i.codigo) === idProducto);

    if (item) {
        item.cantidad += 1;
    } else {
        carrito.push({ ...producto, cantidad: 1 });
    }

    actualizarCarrito();
}

function actualizarCarrito() {
    divCarrito.innerHTML = "";

    let subtotalProductos = 0;

    carrito.forEach((p, index) => {
        const unitario = precioNumero(p.precio);
        const subtotalProducto = unitario * p.cantidad;
        subtotalProductos += subtotalProducto;

        divCarrito.innerHTML += `
            <div class="item-carrito">
                <strong>${p.producto || ""}</strong>
                <small>${p.codigo || ""}</small>
                <div>${p.precio || "$0"} x ${p.cantidad}</div>
                <strong>${formatoPesos(subtotalProducto)}</strong>

                <div class="acciones">
                    <button onclick="restar(${index})">-</button>
                    <button onclick="sumar(${index})">+</button>
                    <button onclick="quitar(${index})">Quitar</button>
                </div>
            </div>
        `;
    });

    const importacion = subtotalProductos * PORCENTAJE_IMPORTACION;
    const envioNacional = subtotalProductos >= ENVIO_GRATIS_DESDE || subtotalProductos === 0 ? 0 : ENVIO_NACIONAL;
    const total = subtotalProductos + importacion + envioNacional;

    subtotalEl.innerText = formatoPesos(subtotalProductos);
    importacionEl.innerText = formatoPesos(importacion);
    envioNacionalEl.innerText = envioNacional === 0 && subtotalProductos > 0 ? "GRATIS" : formatoPesos(envioNacional);
    totalEl.innerText = formatoPesos(total);
}

function sumar(index) {
    carrito[index].cantidad += 1;
    actualizarCarrito();
}

function restar(index) {
    carrito[index].cantidad -= 1;
    if (carrito[index].cantidad <= 0) carrito.splice(index, 1);
    actualizarCarrito();
}

function quitar(index) {
    carrito.splice(index, 1);
    actualizarCarrito();
}

function vaciarCarrito() {
    carrito = [];
    actualizarCarrito();
}

function solicitarPedido() {
    if (carrito.length === 0) {
        alert("Agrega productos antes de solicitar el pedido.");
        return;
    }

    let subtotalProductos = 0;
    let mensaje = "Hola Brick Shipping Chile, quiero solicitar un pedido de importación:%0A%0A";

    carrito.forEach(p => {
        const unitario = precioNumero(p.precio);
        const subtotalProducto = unitario * p.cantidad;
        subtotalProductos += subtotalProducto;

        mensaje += `• ${p.cantidad} x ${p.producto || ""} (${p.codigo || ""}) - ${p.precio || "$0"} c/u%0A`;
    });

    const importacion = subtotalProductos * PORCENTAJE_IMPORTACION;
    const envioNacional = subtotalProductos >= ENVIO_GRATIS_DESDE ? 0 : ENVIO_NACIONAL;
    const total = subtotalProductos + importacion + envioNacional;

    mensaje += `%0ASubtotal productos: ${formatoPesos(subtotalProductos)}`;
    mensaje += `%0AImportación estimada: ${formatoPesos(importacion)}`;
    mensaje += `%0AEnvío nacional: ${envioNacional === 0 ? "GRATIS" : formatoPesos(envioNacional)}`;
    mensaje += `%0A%0ATotal estimado: ${formatoPesos(total)}`;
    mensaje += `%0A%0AEntiendo que los valores son referenciales y sujetos a disponibilidad, tipo de cambio, peso, volumen e internación.`;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${mensaje}`;
    window.open(url, "_blank");
}

btnSolicitar.addEventListener("click", solicitarPedido);

buscador.addEventListener("input", render);
filtroTema.addEventListener("change", render);
orden.addEventListener("change", render);