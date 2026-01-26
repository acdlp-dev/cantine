import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AccueilService } from './services/acceuil.service';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ChartComponent,
  ApexDataLabels,
  ApexXAxis,
  ApexPlotOptions,
  ApexYAxis,
  ApexLegend,
  ApexStroke,
  ApexFill,
  ApexTooltip,
  ApexGrid
} from "ng-apexcharts";

// Configuration type pour ApexCharts
export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  fill: ApexFill;
  legend: ApexLegend;
  grid: ApexGrid;
};

interface Activite {
  id: string;
  description: string;
  date: Date;
  type: 'don' | 'adhesion' | 'recu' | 'autre';
  montant?: number;
}

interface Don {
  id: string;
  date: Date;
  prenom: string;
  nom: string;
  email: string;
  campagne: string;
  montant: number;
  statut: 'valide' | 'en_attente' | 'annule';
}

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [CommonModule, RouterModule, NgApexchartsModule],
  templateUrl: './accueil.component.html',
  styleUrls: ['./accueil.component.scss']
})
export class AccueilComponent implements OnInit {
  // Référence au composant ApexChart pour le manipuler avec l'opérateur non-null
  @ViewChild("chart") chart!: ChartComponent;
  
  // Utilisation de la version non partielle pour être sûr que toutes les propriétés sont définies
  public chartOptions: ChartOptions;
  
  // Statistiques
  totalDons: number | null = null;
  totalDonateurs: number | null = null;
  nouveauxDonateurs: number | null = null;
  donMoyen: number | null = null;
  pourcentageObjectif: number | null = null;
  totalNombreDonateurs: number | null = null;
  nouveauxDonateursMonthly: number | null = null;
  derniersAbonnements: any[] = [];
  periodeActive: '7j' | '30j' | 'annee' = '30j';
  evolutionDonsDonnees: any[] = [];

  // Activités récentes
  activitesRecentes: Activite[] = [];

  // Derniers dons
  derniersDons: Don[] = [];

  // État de chargement
  isLoading = false;

  // Nom de l'association par défaut
  private association = 'au-coeur-de-la-precarite';

  constructor(private http: HttpClient,
    private accueilService: AccueilService) {
    // Initialisation des options du graphique - avec toutes les propriétés requises
    this.chartOptions = {
      series: [
        {
          name: "Montant des dons",
          data: []
        }
      ],
      chart: {
        height: 350,
        type: "line",
        zoom: {
          enabled: false
        },
        toolbar: {
          show: false
        },
        fontFamily: 'inherit'
      },
      dataLabels: {
        enabled: false
      },
      plotOptions: {}, // Ajout de cette propriété manquante
      stroke: {
        curve: 'smooth',
        width: 3
      },
      fill: {}, // Ajout de cette propriété manquante
      legend: {}, // Ajout de cette propriété manquante
      grid: {
        row: {
          colors: ["#f3f3f3", "transparent"],
          opacity: 0.5
        }
      },
      xaxis: {
        categories: []
      },
      yaxis: {
        labels: {
          formatter: function(val) {
            return val + " €";
          }
        }
      },
      tooltip: {
        y: {
          formatter: function(val) {
            return val + " €";
          }
        }
      }
    };
  }

  ngOnInit(): void {
    this.chargerDonnees();
  }

  /**
   * Charge toutes les données du tableau de bord
   */
  chargerDonnees(): void {
    this.isLoading = true;

    // Statistiques globales
    this.chargerStatistiques();
    this.chargerNombreDonateurs();
    this.chargerDerniersAbonnements();
    this.chargerAbonnementMonthly();
    this.chargerEvolutionDons(this.periodeActive);
  }

  /**
   * Charge les statistiques globales
   */
  chargerStatistiques(): void {
    this.accueilService.getTotalDonsAsso().subscribe({
      next: (response) => {
        this.totalDons = response.totalDons;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques', error);
      }
    });
  }

  chargerNombreDonateurs(): void {
    this.accueilService.getNombreDonateurs().subscribe({
      next: (response) => {
        this.totalNombreDonateurs = response.totalNombreDonateurs;
      },
      error: (error) => {
        console.error('Erreur lors du chargement du nombre de donateur', error);
      },
    });
  }

  chargerAbonnementMonthly(): void {
    this.accueilService.getAbonnementMonthly().subscribe({
      next: (response) => {
        this.nouveauxDonateursMonthly = response.nouveauxDonateursMonthly;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des abonnements mensuels', error);
      }
    });
  }

  chargerDerniersAbonnements(): void {
    this.accueilService.getDerniersAbonnements().subscribe({
      next: (response) => {
        if (response.success) {
          this.derniersAbonnements = response.abonnements || [];
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des derniers abonnements', error);
      }
    });
  }

  chargerEvolutionDons(periode: '7j' | '30j' | 'annee'): void {
    this.periodeActive = periode;
    this.isLoading = true;

    this.accueilService.getEvolutionDons(periode).subscribe({
      next: (response) => {
        if (response.success) {
          this.evolutionDonsDonnees = response.donnees;
          this.genererGraphique();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement de l\'évolution des dons', error);
        this.isLoading = false;
      }
    });
  }

  changerPeriode(periode: '7j' | '30j' | 'annee'): void {
    if (periode !== this.periodeActive) {
      this.chargerEvolutionDons(periode);
    }
  }

  genererGraphique(): void {
    if (this.evolutionDonsDonnees.length === 0) return;

    // Préparer les données pour le graphique
    const dates = this.evolutionDonsDonnees.map(item => {
      // Formater la date selon la période
      if (this.periodeActive === 'annee') {
        const [annee, mois] = item.date.split('-');
        return `${mois}/${annee}`;
      }
      // Formater pour jour
      const date = new Date(item.date);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit'
      });
    });

    const montants = this.evolutionDonsDonnees.map(item => item.total);

    // Mettre à jour les options du graphique
    this.chartOptions.series = [
      {
        name: "Montant des dons",
        data: montants
      }
    ];
    this.chartOptions.xaxis.categories = dates;
  }
}