import { Component, OnInit } from '@angular/core';
import { EnvioService } from '../../../../shared/services/envio.service';
import { RecojoService } from '../../../../shared/services/recojo.service';
import { ClienteService } from '../../../../shared/services/cliente.service';
import { PedidoService } from '../../../../shared/services/pedido.service';
import { DetallePedidoService } from '../../../../shared/services/detalle-pedido.service';
import { ProductoService } from '../../../../shared/services/producto.service';
import { DetallePedidoBody } from '../../../../shared/models/detallePedido';
import { CarritoService } from '../../../../shared/services/carrito.service';
import { ComprobanteService } from '../../../../shared/services/comprobante.service'; // Importa el servicio de comprobante

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css']
})
export class PaymentComponent implements OnInit {
  carritoIds: string[] = [];
  cantidades: { [key: string]: number } = {};

  constructor(
    private envioService: EnvioService,
    private recojoService: RecojoService,
    private clienteService: ClienteService,
    private pedidoService: PedidoService,
    private detallePedidoService: DetallePedidoService,
    private productoService: ProductoService,
    private carritoService: CarritoService,
    private comprobanteService: ComprobanteService // Inyecta el servicio de comprobante
  ) {}

  ngOnInit(): void {
    this.carritoIds = this.carritoService.getCarritoIds();
    this.cargarCantidadesDesdeStorage();
  }

  cargarCantidadesDesdeStorage(): void {
    const cantidadesGuardadas = localStorage.getItem('cantidades');
    if (cantidadesGuardadas) {
      this.cantidades = JSON.parse(cantidadesGuardadas);
    }
  }

  continue(): void {
    const selectedDepartamento = localStorage.getItem('selectedDepartamento');
    const selectedProvincia = localStorage.getItem('selectedProvincia');
    const selectedDistrito = localStorage.getItem('selectedDistrito');
    const referencia = localStorage.getItem('referencia'); // "calle y número"
    const CodigoPostal = localStorage.getItem('CodigoPostal');
    const total = parseFloat(localStorage.getItem('totalCarrito') || '0');

    const rucData = localStorage.getItem('rucData') ? JSON.parse(localStorage.getItem('rucData')!) : null;
    const dniData = localStorage.getItem('dniData') ? JSON.parse(localStorage.getItem('dniData')!) : null;

    const razonSocial = localStorage.getItem('switchState') === 'true' ? rucData?.razonSocial : `${dniData?.nombres} ${dniData?.apellidoPaterno} ${dniData?.apellidoMaterno}`;
    const email = localStorage.getItem('switchState') === 'true' ? localStorage.getItem('gmailFactura') : localStorage.getItem('gmailBoleta');
    const telefonoMovil = localStorage.getItem('switchState') === 'true' ? localStorage.getItem('celularFactura') : localStorage.getItem('celularBoleta');
    const tipoDocumento = localStorage.getItem('switchState') === 'true' ? 'RUC' : 'DNI';
    const numeroDocumento = localStorage.getItem('switchState') === 'true' ? rucData?.ruc : dniData?.dni;
    const direccionFiscal = localStorage.getItem('switchState') === 'true' ? rucData?.direccion : '';

    let envioData = null;
    let recojoData = null;

    if (selectedDepartamento && selectedProvincia && selectedDistrito && referencia && CodigoPostal) {
      const [calle, numeroDomicilio] = referencia.split('N°').map(part => part.trim());
      const localidad = `${selectedDepartamento} ${selectedProvincia} ${selectedDistrito}`;

      envioData = {
        region: selectedDepartamento,
        provincia: selectedProvincia,
        distrito: selectedDistrito,
        localidad: localidad,
        calle: calle,
        nDomicilio: numeroDomicilio,
        codigoPostal: CodigoPostal,
        fechaEnvio: null,
        fechaEntrega: null,
        responsableEntrega: null,
        idPersonal: 1
      };
    } else {
      recojoData = {
        fechaListo: null,
        fechaEntrega: null,
        responsableDeRecojo: null,
      };
    }

    const clienteData = {
      razonSocial: razonSocial,
      email: email,
      telefonoMovil: telefonoMovil,
      tipoDocumento: tipoDocumento,
      numeroDocumento: numeroDocumento,
      direccionFiscal: direccionFiscal
    };

    if (envioData) {
      this.envioService.create(envioData).subscribe((envio: any) => {
        const envioId = envio?.idEnvio || envio?.data?.idEnvio;
        if (envioId != null) {
          localStorage.setItem('envioId', envioId.toString());
          this.savePedido(envioId, null, clienteData, total);
        } else {
          console.error('Error: Envio no contiene un id.', envio);
        }
      });
    } else if (recojoData) {
      this.recojoService.create(recojoData).subscribe((recojo: any) => {
        const recojoId = recojo?.idRecojo;
        if (recojoId != null) {
          localStorage.setItem('recojoId', recojoId.toString());
          this.savePedido(null, recojoId, clienteData, total);
        } else {
          console.error('Error: Recojo no contiene un id.', recojo);
        }
      });
    }
  }

  savePedido(envioId: number | null, recojoId: number | null, clienteData: any, total: number): void {
    this.clienteService.create(clienteData).subscribe((cliente: any) => {
      const clienteId = cliente?.idCliente || cliente?.id;
      if (clienteId != null) {
        localStorage.setItem('clienteId', clienteId.toString());

        const pedidoData = {
          fechaPedido: new Date(),
          fechaCancelado: null,
          tipoPedido: envioId ? 'Envio a Domicilio' : 'Recojo en Tienda',
          estado: 'Pendiente',
          total: total,
          idCliente: clienteId,
          idPersonal: 1,
          idEnvio: envioId,
          idRecojo: recojoId
        };

        this.pedidoService.create(pedidoData).subscribe((pedido: any) => {
          const pedidoId = pedido?.idPedido || pedido?.id;
          if (pedidoId != null) {
            localStorage.setItem('pedidoId', pedidoId.toString());
            this.saveDetallePedido(pedidoId);
            this.createComprobante(clienteData, pedidoId); // Llama al método para crear el comprobante
          } else {
            console.error('Error: Pedido no contiene un id.', pedido);
          }
        });
      } else {
        console.error('Error: Cliente no contiene un id.', cliente);
      }
    });
  }

  createComprobante(clienteData: any, pedidoId: number): void {
    const tipoDocumento = localStorage.getItem('switchState') === 'true' ? 'RUC' : 'DNI';
    const tipoComprobante = tipoDocumento === 'RUC' ? 'Factura' : 'Boleta';
    const fechaEmision = new Date();

    const comprobanteData = {
      tipoComprobante: tipoComprobante,
      fechaEmision: fechaEmision,
      idPedido: Number(pedidoId)
    };

    this.comprobanteService.create(comprobanteData).subscribe({
      next: (res) => {
        console.log('Comprobante creado:', res);
      },
      error: (err) => {
        console.error('Error al crear el comprobante:', err);
      }
    });
  }

  saveDetallePedido(pedidoId: number): void {
    if (this.carritoIds.length === 0) {
      console.error('No hay productos en el carrito.');
      return;
    }

    for (const id of this.carritoIds) {
      const cantidad = this.cantidades[id]; 
      this.productoService.getById(Number(id)).subscribe((producto: any) => {
        const precioUnitario = producto?.precio;
        const precioDescuento = producto?.precioOferta || 0;
        const subtotal = precioDescuento > 0 ? precioDescuento * cantidad : precioUnitario * cantidad;

        const detallePedidoData: DetallePedidoBody = {
          cantidad: cantidad,
          precioUnitario: precioUnitario,
          precioDescuento: precioDescuento,
          subtotal: subtotal,
          idProducto: Number(id),
          idPedido: pedidoId
        };

        this.detallePedidoService.create(detallePedidoData).subscribe({
          next: (res) => {
            console.log('Detalle de pedido guardado:', res);
          },
          error: (err) => {
            console.error('Error al guardar el detalle de pedido:', err);
          }
        });
      }, error => {
        console.error('Error al obtener el producto:', error);
      });
    }
  }
}
