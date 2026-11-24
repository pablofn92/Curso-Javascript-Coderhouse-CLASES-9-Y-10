// Simulador: e-commerce
let productoId = 0;
let productos = [];

class Producto {
  constructor(id, nombre, precio, categoria, imagen, descripcion, stock) {
    this.id = id;
    this.nombre = nombre;
    this.precio = parseFloat(precio);
    this.categoria = categoria;
    this.imagen = imagen;
    this.descripcion = descripcion;
    this.stock = parseInt(stock);
  }

  sumarIva() {
    this.precio *= 1.21;
  }

  aplicarDescuento(descuento) {
    this.precio *= 1 - descuento / 100;
  }
}

async function obtenerProductosDesdeAPI() {
  const respuesta = await fetch("./productos.json");

  if (!respuesta.ok) {
    throw new Error(`Error HTTP ${respuesta.status}: No se pudo cargar el catálogo.`);
  }

  return await respuesta.json();
}

async function inicializarTienda() {
  const containerProductos = document.getElementById("productos");

  const mensajeCarga = document.createElement("p");
  mensajeCarga.id = "mensaje-carga";
  mensajeCarga.textContent = "Cargando productos...";
  containerProductos.innerHTML = "";
  containerProductos.append(mensajeCarga);

  try {
    const productosGuardados = JSON.parse(localStorage.getItem("productos"));

    if (productosGuardados && productosGuardados.length > 0) {
      for (const item of productosGuardados) {
        const { id, nombre, precio, categoria, imagen, descripcion, stock } = item;
        productos.push(new Producto(id, nombre, precio, categoria, imagen, descripcion, stock));
      }
    } else {
      const datosAPI = await obtenerProductosDesdeAPI();

      for (const item of datosAPI) {
        const { id, nombre, precio, categoria, imagen, descripcion, stock } = item;
        const nuevoProd = new Producto(id, nombre, precio, categoria, imagen, descripcion, stock);
        nuevoProd.sumarIva();
        nuevoProd.aplicarDescuento(10);
        productos.push(nuevoProd);
      }

      localStorage.setItem("productos", JSON.stringify(productos));
    }

    productoId = productos.reduce((max, prod) => (prod.id > max ? prod.id : max), -1) + 1;
    imprimirProductosEnHTML(productos);

  } catch (error) {

    Swal.fire({
      icon: "error",
      title: "Error al cargar productos",
      text: error.message || "Ocurrió un fallo de red al obtener el catálogo.",
      confirmButtonText: "Reintentar"
    }).then((result) => {
      if (result.isConfirmed) {
        inicializarTienda();
      }
    });

    containerProductos.innerHTML = `<p class="error-carga">No se pudo cargar el catálogo en este momento.</p>`;

  } finally {

    document.getElementById("mensaje-carga")?.remove();
  }
}

function mostrarAvisoPromocional() {
  setTimeout(() => {
    const bannerPromo = document.createElement("div");
    bannerPromo.className = "banner-promo";
    bannerPromo.innerHTML = `
      <p>🎉 <strong>¡Promo activa!</strong> Todos nuestros productos con un <strong>10% OFF</strong>.</p>
      <button id="cerrar-promo">Cerrar</button>
    `;

    document.body.prepend(bannerPromo);

    document.getElementById("cerrar-promo").addEventListener("click", () => {
      bannerPromo.remove();
    });
  }, 4000);
}

function procesarPagoSimulado(totalCompra) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (totalCompra <= 0) {
        reject(new Error("El monto de la compra no es válido."));
      } else {
        const numeroOrden = Math.floor(100000 + Math.random() * 900000);
        resolve({
          orden: numeroOrden,
          mensaje: `Pago aprobado por $${totalCompra.toFixed(2)}.`
        });
      }
    }, 2000);
  });
}

async function finalizarCompra() {
  const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  Swal.fire({
    title: "Procesando tu compra...",
    text: "Por favor, aguardá unos segundos.",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    const resultado = await procesarPagoSimulado(total);

    for (const itemCarrito of carrito) {
      const productoCatalogo = productos.find((p) => p.id === itemCarrito.id);
      if (productoCatalogo) {
        productoCatalogo.stock -= itemCarrito.cantidad;
      }
    }

    localStorage.setItem("productos", JSON.stringify(productos));
    imprimirProductosEnHTML(productos);
    vaciarCarrito(false);

    Swal.fire({
      icon: "success",
      title: "¡Compra exitosa!",
      html: `<p>${resultado.mensaje}</p><p><strong>N° de orden: #${resultado.orden}</strong></p>`
    });

  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "No se pudo completar el pago",
      text: error.message
    });
  } finally {
    console.log("Intento de transacción finalizado.");
  }
}

let carrito = JSON.parse(localStorage.getItem("carrito")) ?? [];

function guardarCarrito() {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}

function imprimirProductosEnHTML(listaProductos) {
  const containerProductos = document.getElementById("productos");
  containerProductos.innerHTML = "";

  for (const producto of listaProductos) {
    const { nombre, precio, imagen, descripcion, stock } = producto;
    const card = document.createElement("article");
    card.className = "card";
    const sinStock = stock <= 0;

    card.innerHTML = `
      <h3>${nombre}</h3>
      <img src="${imagen}" alt="${descripcion}" />
      <p>$${precio.toFixed(2)}</p>
      <p class="stock-info">Stock: ${stock}</p>
      <button class="card-boton" ${sinStock ? "disabled" : ""}>
        ${sinStock ? "Sin stock" : "Agregar al carrito"}
      </button>
    `;

    containerProductos.append(card);

    const cardBtn = card.querySelector(".card-boton");
    cardBtn.addEventListener("click", () => {
      agregarAlCarrito(producto);
    });
  }
}

function agregarAlCarrito(producto) {
  const itemExistente = carrito.find((item) => item.id === producto.id);

  if (itemExistente) {
    if (itemExistente.cantidad < producto.stock) {
      itemExistente.cantidad++;
    } else {
      Swal.fire({
        icon: "warning",
        title: "Stock máximo alcanzado",
        text: `No quedan más unidades disponibles de ${producto.nombre}.`,
        timer: 2500,
        showConfirmButton: false
      });
      return;
    }
  } else {
    const { id, nombre, precio } = producto;
    carrito.push({ id, nombre, precio, cantidad: 1 });
  }

  guardarCarrito();
  imprimirCarrito(carrito);

  Swal.fire({
    toast: true,
    position: "bottom-end",
    icon: "success",
    title: `${producto.nombre} agregado al carrito`,
    showConfirmButton: false,
    timer: 1500
  });
}

function eliminarDelCarrito(id) {
  carrito = carrito.filter((item) => item.id !== id);
  guardarCarrito();
  imprimirCarrito(carrito);
}

function vaciarCarrito(mostrarAviso = true) {
  carrito = [];
  localStorage.removeItem("carrito");
  imprimirCarrito(carrito);

  if (mostrarAviso) {
    Swal.fire({
      toast: true,
      position: "bottom-end",
      icon: "info",
      title: "Carrito vaciado",
      showConfirmButton: false,
      timer: 1500
    });
  }
}

function imprimirCarrito(array) {
  const contenedorCarrito = document.getElementById("carrito");
  contenedorCarrito.innerHTML = "";

  if (array.length === 0) {
    contenedorCarrito.innerHTML = '<p class="carrito-vacio">-- El carrito está vacío --</p>';
    return;
  }

  let total = 0;

  for (const elemento of array) {
    const { id, nombre, precio, cantidad } = elemento;
    const subtotal = precio * cantidad;
    total += subtotal;

    const div = document.createElement("div");
    div.innerHTML = `
      <p>${nombre} (x${cantidad}) - $${subtotal.toFixed(2)}</p>
      <button class="btn-eliminar">Eliminar</button>
    `;

    div.querySelector(".btn-eliminar").addEventListener("click", () => {
      eliminarDelCarrito(id);
    });

    contenedorCarrito.append(div);
  }

  const footerCarrito = document.createElement("div");
  footerCarrito.innerHTML = `
    <p><strong>Total: $${total.toFixed(2)}</strong></p>
    <button id="btn-finalizar">Finalizar compra</button>
    <button id="btn-vaciar">Vaciar carrito</button>
  `;

  footerCarrito.querySelector("#btn-finalizar").addEventListener("click", finalizarCompra);
  footerCarrito.querySelector("#btn-vaciar").addEventListener("click", () => vaciarCarrito(true));
  contenedorCarrito.append(footerCarrito);
}

const formAgregarProducto = document.getElementById("form-agregar-producto");
formAgregarProducto?.addEventListener("submit", (event) => {
event.preventDefault();
const nombre = document.getElementById("input-nombre").value;
const precio = document.getElementById("input-precio").value;
const imagen = document.getElementById("input-imagen").value;
const descripcion = document.getElementById("input-descripcion").value;
const stock = document.getElementById("input-stock").value;
const categoria = document.getElementById("input-categoria").value;
const nuevoProducto = new Producto(productoId++, nombre, precio, categoria, imagen, descripcion, stock);
nuevoProducto.sumarIva();
nuevoProducto.aplicarDescuento(10);
productos.push(nuevoProducto);
localStorage.setItem("productos", JSON.stringify(productos));
imprimirProductosEnHTML(productos);
formAgregarProducto.reset();
Swal.fire({
icon: "success",
title: "Producto creado",
text: `${nuevoProducto.nombre} se agregó al catálogo.`,
timer: 2000,
showConfirmButton: false
});
});
const inputBusqueda = document.getElementById("input-busqueda");
inputBusqueda?.addEventListener("input", () => {
const busqueda = inputBusqueda.value.trim().toLowerCase();
const productosFiltrados = productos.filter((producto) =>
producto.nombre.toLowerCase().includes(busqueda)
);
imprimirProductosEnHTML(productosFiltrados);
});
document.getElementById("form-busqueda")?.addEventListener("submit", (event) => {
event.preventDefault();
});

inicializarTienda();
imprimirCarrito(carrito);
mostrarAvisoPromocional();