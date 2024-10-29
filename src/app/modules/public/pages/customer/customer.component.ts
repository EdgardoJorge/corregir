import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RucService } from '../../services/ruc.service';
import { DniService } from '../../services/dni.service'; 

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css']
})
export class CustomerComponent {
  switchState: boolean = false;
  rucData: any;
  dniData: any;
  noResultsDNI: boolean = false;
  noResultsRUC: boolean = false;
  gmailBoleta: string = '';
  celularBoleta: string = '';
  gmailFactura: string = '';
  celularFactura: string = '';

  constructor(private rucService: RucService, private dniService: DniService, private router: Router) {
    const storedSwitchState = localStorage.getItem('switchState');
    console.log('Estado del switch recuperado de localStorage:', storedSwitchState); // Verificación
    this.switchState = storedSwitchState ? JSON.parse(storedSwitchState) : false;
  }

  fetchRucData(ruc: string) {
    this.rucService.getRucData(ruc).subscribe({
      next: (data) => {
        if (data && (data.razonSocial || data.ruc)) {
          this.rucData = data; 
          this.noResultsRUC = false;
        } else {
          this.rucData = null;
          this.noResultsRUC = true;
        }
        console.log(this.rucData);
      },
      error: (error) => {
        console.error('Error al obtener datos del RUC:', error);
        this.rucData = null;
        this.noResultsRUC = true;
      }
    });
  }

  fetchDniData(dni: string) {
    this.dniService.getDniData(dni).subscribe({
      next: (data) => {
        if (data && (data.dni || data.nombres || data.apellidoPaterno || data.apellidoMaterno || data.codVerifica)) {
          this.dniData = data;
          this.noResultsDNI = false;
        } else {
          this.dniData = null;
          this.noResultsDNI = true;
        }
        console.log(this.dniData);
      },
      error: (error) => {
        console.error('Error al obtener datos del DNI:', error);
        this.dniData = null;
        this.noResultsDNI = true;
      }
    });
  }

  toggleSwitch() {
    localStorage.setItem('switchState', JSON.stringify(this.switchState)); // Guarda en localStorage
    console.log('Switch state guardado en localStorage:', this.switchState); // Verificación
  }

  continue() {
    const isBoletaComplete = this.gmailBoleta && this.celularBoleta;
    const isFacturaComplete = this.gmailFactura && this.celularFactura;

    if (isBoletaComplete || isFacturaComplete) {
      if (isBoletaComplete) {
        localStorage.setItem('dniData', JSON.stringify(this.dniData));
        localStorage.setItem('gmailBoleta', this.gmailBoleta);
        localStorage.setItem('celularBoleta', this.celularBoleta);
      }
      if (isFacturaComplete) {
        localStorage.setItem('rucData', JSON.stringify(this.rucData));
        localStorage.setItem('gmailFactura', this.gmailFactura);
        localStorage.setItem('celularFactura', this.celularFactura);
      }
      this.router.navigate(['/recorrido/ubicacion']);
    } else {
      alert("Por favor, completa todos los datos de boleta o factura antes de continuar.");
    }
  }
}
