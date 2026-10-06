// ============================================================
// tienda.js — BrisaByte
// Nuestro JavaScript. Se carga después de Bootstrap, por eso
// aquí ya existe el objeto «bootstrap».
// ============================================================

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

// ===== Catálogo: filtros, búsqueda y orden =====
const catalogo = document.getElementById('catalogo');
const btnTema = document.getElementById("btnTema");
const tarjetas = Array.from(catalogo.querySelectorAll('[data-marca]'));
const buscador = document.getElementById('buscador');
const ordenar = document.getElementById('ordenar');
const rangoPrecio = document.getElementById('rangoPrecio');
const etiquetaPrecio = document.getElementById('etiquetaPrecio');
const contadorResultados = document.getElementById('contadorResultados');
const sinResultados = document.getElementById('sinResultados');

// Guardamos el orden original para poder volver a él
tarjetas.forEach((tarjeta, indice) => {
  tarjeta.dataset.orden = indice;
});

function aplicarFiltros() {
  const texto = buscador.value.trim().toLowerCase();
  const marca = document.querySelector('input[name="marca"]:checked').value;
  const ram = document.querySelector('input[name="ram"]:checked').value;
  const precioMaximo = Number(rangoPrecio.value);
  etiquetaPrecio.textContent = formatoPesos.format(precioMaximo);

  // 1. Mostrar u ocultar con la utilidad d-none
  let visibles = 0;
  tarjetas.forEach((tarjeta) => {
    const cumple =
      (marca === 'todas' || tarjeta.dataset.marca === marca) &&
      (ram === 'todas' || tarjeta.dataset.ram === ram) &&
      Number(tarjeta.dataset.precio) <= precioMaximo &&
      tarjeta.dataset.busqueda.toLowerCase().includes(texto);
    tarjeta.classList.toggle('d-none', !cumple);
    if (cumple) visibles++;
  });

  // 2. Reordenar según la opción elegida
  const criterio = ordenar.value;
  const ordenadas = tarjetas.slice().sort((a, b) => {
    if (criterio === 'menor') return a.dataset.precio - b.dataset.precio;
    if (criterio === 'mayor') return b.dataset.precio - a.dataset.precio;
    return a.dataset.orden - b.dataset.orden;
  });
  ordenadas.forEach((tarjeta) => catalogo.appendChild(tarjeta));

  // 3. Contador y mensaje cuando no hay resultados
  contadorResultados.textContent = `${visibles} de ${tarjetas.length} portátiles`;
  sinResultados.classList.toggle('d-none', visibles > 0);
}

document.querySelectorAll('input[name="marca"], input[name="ram"]').forEach((campo) => {
  campo.addEventListener('change', aplicarFiltros);
});
[buscador, rangoPrecio].forEach((campo) => campo.addEventListener('input', aplicarFiltros));
ordenar.addEventListener('change', aplicarFiltros);

document.getElementById('btnLimpiar').addEventListener('click', () => {
  document.getElementById('marcaTodas').checked = true;
  document.getElementById('ramTodas').checked = true;
  rangoPrecio.value = rangoPrecio.max;
  buscador.value = '';
  ordenar.value = 'relevancia';
  aplicarFiltros();
});

// Los enlaces de marca (franja superior) eligen el filtro y bajan al catálogo
document.querySelectorAll('[data-ir-marca]').forEach((enlace) => {
  enlace.addEventListener('click', () => {
    document.getElementById(`marca-${enlace.dataset.irMarca}`).checked = true;
    aplicarFiltros();
  });
});

aplicarFiltros();

// ===== Carrito — agregar productos =====
const carrito = [];

// Muestra el aviso (toast) con un mensaje
function mostrarAviso(mensaje) {
  const aviso = document.getElementById('avisoCarrito');
  aviso.querySelector('.toast-body').textContent = mensaje;
  bootstrap.Toast.getOrCreateInstance(aviso).show();
}

// Agrega un producto y avisa a toda la página que el carrito cambió
function agregarAlCarrito(nombre, precio) {
  carrito.push({ nombre, precio });
  document.dispatchEvent(new CustomEvent('carrito:cambio'));
  mostrarAviso(`«${nombre}» se agregó al carrito`);
}

// Cada botón «Agregar» lee sus atributos data-nombre y data-precio
document.querySelectorAll('.btn-agregar').forEach((boton) => {
  boton.addEventListener('click', () => {
    agregarAlCarrito(boton.dataset.nombre, Number(boton.dataset.precio));
  });
});

// Cuando el carrito cambia, se actualiza el contador de la barra
document.addEventListener('carrito:cambio', () => {
  document.getElementById('contadorCarrito').textContent = carrito.length;
});

// ===== Mostrar el carrito en el panel lateral =====
const listaCarrito = document.getElementById('listaCarrito');
const totalCarrito = document.getElementById('totalCarrito');
const btnPagar = document.getElementById('btnPagar');

function avisarCambio() {
  document.dispatchEvent(new CustomEvent('carrito:cambio'));
}

function pintarCarrito() {
  listaCarrito.innerHTML = '';

  if (carrito.length === 0) {
    const vacio = document.createElement('li');
    vacio.className = 'list-group-item text-body-secondary';
    vacio.textContent = 'Tu carrito está vacío.';
    listaCarrito.appendChild(vacio);
  }

  carrito.forEach((producto, indice) => {
    const item = document.createElement('li');
    item.className = 'list-group-item d-flex align-items-center gap-2 px-0';

    const nombre = document.createElement('span');
    nombre.className = 'flex-grow-1';
    nombre.textContent = producto.nombre;

    const precio = document.createElement('strong');
    precio.textContent = formatoPesos.format(producto.precio);

    const quitar = document.createElement('button');
    quitar.type = 'button';
    quitar.className = 'btn-close';
    quitar.setAttribute('aria-label', `Quitar ${producto.nombre}`);
    quitar.addEventListener('click', () => {
      carrito.splice(indice, 1);
      avisarCambio();
    });

    item.append(nombre, precio, quitar);
    listaCarrito.appendChild(item);
  });

  const total = carrito.reduce((suma, producto) => suma + producto.precio, 0);
  totalCarrito.textContent = formatoPesos.format(total);
  btnPagar.disabled = carrito.length === 0;
}

document.getElementById('btnVaciar').addEventListener('click', () => {
  carrito.length = 0;
  avisarCambio();
});

btnPagar.addEventListener('click', () => {
  carrito.length = 0;
  avisarCambio();
  bootstrap.Offcanvas.getOrCreateInstance('#panelCarrito').hide();
  mostrarAviso('¡Gracias por tu compra! (simulación)');
});

document.addEventListener('carrito:cambio', pintarCarrito);
pintarCarrito();

// ===== Vista rápida: ficha técnica en un modal =====
const modalProducto = document.getElementById('modalProducto');
let productoEnModal = null;

// Antes de abrirse, el modal lee los datos del botón que lo abrió
modalProducto.addEventListener('show.bs.modal', (evento) => {
  const boton = evento.relatedTarget;
  productoEnModal = {
    nombre: boton.dataset.nombre,
    precio: Number(boton.dataset.precio),
  };

  const imagen = document.getElementById('modalImagen');
  imagen.src = boton.dataset.imagen;
  imagen.alt = boton.dataset.nombre;
  modalProducto.querySelector('.modal-title').textContent = boton.dataset.nombre;
  document.getElementById('modalDescripcion').textContent = boton.dataset.descripcion;
  document.getElementById('modalPrecio').textContent =
    formatoPesos.format(productoEnModal.precio);

  // Las especificaciones vienen separadas por | en data-specs
  const listaSpecs = document.getElementById('modalSpecs');
  listaSpecs.innerHTML = '';
  boton.dataset.specs.split('|').forEach((linea) => {
    const item = document.createElement('li');
    item.innerHTML = '<i class="bi bi-check2-square"></i>';
    const texto = document.createElement('span');
    texto.textContent = linea;
    item.appendChild(texto);
    listaSpecs.appendChild(item);
  });
});

document.getElementById('btnAgregarModal').addEventListener('click', () => {
  agregarAlCarrito(productoEnModal.nombre, productoEnModal.precio);
  bootstrap.Modal.getInstance(modalProducto).hide();
});

// ===== Oferta relámpago: cuenta regresiva hasta la medianoche =====
const cuenta = {
  horas: document.getElementById('cuentaHoras'),
  minutos: document.getElementById('cuentaMinutos'),
  segundos: document.getElementById('cuentaSegundos'),
};

function actualizarCuenta() {
  const ahora = new Date();
  const fin = new Date(ahora);
  fin.setHours(24, 0, 0, 0);
  const restante = Math.max(0, Math.floor((fin - ahora) / 1000));
  const dos = (n) => String(n).padStart(2, '0');
  cuenta.horas.textContent = dos(Math.floor(restante / 3600));
  cuenta.minutos.textContent = dos(Math.floor((restante % 3600) / 60));
  cuenta.segundos.textContent = dos(restante % 60);
}

actualizarCuenta();
setInterval(actualizarCuenta, 1000);

// ===== Validar el formulario de suscripción =====
const formSuscripcion = document.getElementById('formSuscripcion');

formSuscripcion.addEventListener('submit', (evento) => {
  evento.preventDefault(); // no hay servidor: evitamos recargar la página

  if (!formSuscripcion.checkValidity()) {
    formSuscripcion.classList.add('was-validated'); // Bootstrap pinta los errores
    return;
  }

  mostrarAviso('¡Gracias! Te enviaremos nuestras ofertas.');
  formSuscripcion.reset();
  formSuscripcion.classList.remove('was-validated');
});

// ===== Tooltips y botón «volver arriba» =====
document.querySelectorAll('[data-bs-title]').forEach((elemento) => {
  new bootstrap.Tooltip(elemento);
});

const btnArriba = document.getElementById('btnArriba');

window.addEventListener('scroll', () => {
  btnArriba.classList.toggle('d-none', window.scrollY < 400);
});

btnArriba.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});


btnTema.addEventListener("click", () => {
  document.body.classList.toggle("tema-blanco");

  if (document.body.classList.contains("tema-blanco")) {
    btnTema.textContent = "Modo oscuro";
  } else {
    btnTema.textContent = "Modo blanco";
  }
});