import { Injectable } from '@angular/core';
import { TourService, TourStep } from '../../../shared/services/tour.service';
import { Router, NavigationEnd } from '@angular/router';
import { filter, take, switchMap } from 'rxjs/operators';
import { OnboardingService } from './onboarding.service';

@Injectable({
  providedIn: 'root'
})
export class AutoTourService {
  private hasTriggeredTour = false;
  private readonly AUTO_TOUR_KEY = 'myamana_auto_tour_triggered';
  private readonly DASHBOARD_PATH = '/backoffice/accueil';
  private readonly CANTINE_PATH = '/backoffice/cantine';
  private readonly VEHICULE_PATH = '/backoffice/vehicule';

  constructor(
    private tourService: TourService,
    private router: Router,
    private onboardingService: OnboardingService
  ) {
    // Vérifier si le tour automatique a déjà été déclenché dans cette session
    const autoTourTriggered = localStorage.getItem(this.AUTO_TOUR_KEY);
    this.hasTriggeredTour = autoTourTriggered === 'true';

    // S'abonner aux événements de navigation
    // La visite sera déclenchée si hasTriggeredTour est false ET si isOnboarded est false en BDD
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      if (!this.hasTriggeredTour) {
        this.checkAndStartTour(event.url);
      }
    });
  }

  /**
   * Vérifie si l'utilisateur est sur une page principale du backoffice et démarre le tour si nécessaire
   */
  private checkAndStartTour(url: string): void {
    if (this.hasTriggeredTour) {
      return;
    }

    // Attendre un peu pour que la page se charge complètement
    setTimeout(() => {
      if (url === this.DASHBOARD_PATH || url === this.CANTINE_PATH || url === this.VEHICULE_PATH) {
        // Vérifier si l'utilisateur a déjà vu la visite guidée
        this.onboardingService.hasSeenGuidedTour().subscribe({
          next: (tourResponse: any) => {
            if (tourResponse && tourResponse.result && tourResponse.result.hasSeenTour) {
              console.log('L\'utilisateur a déjà vu la visite guidée');
              return;
            }
            
            // Si l'utilisateur n'a pas encore vu la visite guidée, récupérer ses préférences
            this.onboardingService.isOnboardingCompleted().subscribe({
              next: (response: any) => {
                if (!response || !response.result) {
                  console.log('Aucune information d\'onboarding disponible');
                  return;
                }

                try {
                  // Nous savons déjà que l'utilisateur a complété l'onboarding mais n'a pas vu la visite guidée
                  console.log('L\'utilisateur a complété l\'onboarding mais n\'a pas encore vu la visite guidée');
                  
                  // Utiliser la même méthode que celle utilisée par le bouton de visite guidée
                  this.getCurrentPageSteps().then(steps => {
                    this.tourService.startTour(steps);
                    this.markTourAsTriggered();
                  });
                } catch (error) {
                  console.error('Erreur lors du démarrage de la visite guidée:', error);
                }
              },
              error: (error) => {
                console.error('Erreur lors de la récupération des préférences:', error);
              }
            });
          },
          error: (error) => {
            console.error('Erreur lors de la vérification du statut de la visite guidée:', error);
          }
        });
      }
    }, 1000);
  }

  /**
   * Marque le tour automatique comme déclenché
   */
  private markTourAsTriggered(): void {
    localStorage.setItem(this.AUTO_TOUR_KEY, 'true');
    this.hasTriggeredTour = true;
  }

  /**
   * Réinitialise l'état du tour automatique
   */
  resetAutoTour(): void {
    localStorage.removeItem(this.AUTO_TOUR_KEY);
    this.hasTriggeredTour = false;
    
    // La visite guidée sera déclenchée automatiquement lors de la prochaine navigation
    // si isOnboarded est false dans la base de données
  }
  
  /**
   * Récupère les étapes du tour adaptées à la page courante
   * Cette méthode est utilisée par le bouton de visite guidée
   * @returns Les étapes du tour adaptées à la page courante
   */
  getCurrentPageSteps(): Promise<TourStep[]> {
    // Récupérer l'URL courante
    const currentPath = this.router.url;
    
    // Récupérer les préférences utilisateur
    return new Promise((resolve) => {
      this.onboardingService.isOnboardingCompleted().subscribe({
        next: (response: any) => {
          console.log('Réponse API complète:', response);
          
          if (response && response.result) {
            const userPreferences = {
              donations: response.result.donations || false,
              cantine: response.result.cantine || false,
              suiviVehicule: response.result.suiviVehicule || false
            };
            
            // Obtenir les étapes adaptées
            const steps = this.getStepsForPath(currentPath, userPreferences);
            console.log(`Nombre d'étapes générées: ${steps.length}`);
            resolve(steps);
          } else {
            const debugPrefs = { donations: true, cantine: true, suiviVehicule: true };
            const steps = this.getStepsForPath(currentPath, debugPrefs);
            resolve(steps);
          }
        },
        error: (error) => {
          // Pour le débogage, on force également toutes les préférences à true
          const debugPrefs = { donations: true, cantine: true, suiviVehicule: true };
          const steps = this.getStepsForPath(currentPath, debugPrefs);
          resolve(steps);
        }
      });
    });
  }

  /**
   * Récupère les étapes du tour en fonction du chemin actuel et des préférences utilisateur
   * Cette méthode est publique pour permettre au bouton de visite guidée d'utiliser les mêmes étapes
   * @param path Le chemin de la page actuelle
   * @param userPreferences Les préférences d'onboarding de l'utilisateur
   */
  getStepsForPath(path: string, userPreferences?: { donations: boolean, cantine: boolean, suiviVehicule: boolean }): TourStep[] {
    // Valeurs par défaut si les préférences ne sont pas fournies
    // IMPORTANT: On utilise strictement les valeurs de la BDD, avec false par défaut pour éviter d'afficher des sections non activées
    const prefs = userPreferences || { donations: false, cantine: false, suiviVehicule: false };
        
    // Étapes communes pour toutes les pages
    const commonSteps: TourStep[] = [
      {
        element: '.sidebar-container',
        popover: {
          title: 'Menu de navigation',
          description: 'Bienvenue dans MyAmana ! Ici vous retrouverez toutes les fonctionnalités disponibles selon votre configuration.',
          position: 'right'
        }
      },
      {
        element: '.main-content',
        popover: {
          title: 'Zone de contenu',
          description: 'C\'est ici que s\'affichera le contenu de chaque section selon vos choix de navigation.',
          position: 'left'
        }
      }
    ];
    
    // Générer les étapes pour chaque élément de la sidebar
    const featureSteps: TourStep[] = [];
    
    // === SECTION ACCUEIL (TOUJOURS PRÉSENTE) ===
    featureSteps.push({
      element: '[data-tour="dashboard-link"], .dashboard-link, .sidebar-container a[href*="accueil"]',
      popover: {
        title: 'Accueil',
        description: 'Voilà l\'accueil pour une vue globale de votre activité.',
        position: 'right'
      }
    });
    
    // === SECTION DONS SI ACTIVÉE ===
    if (prefs.donations) {
      // SECTION DONATIONS - UTILISATION DE SÉLECTEURS PLUS GÉNÉRIQUES
      
      // Mes Dons - on utilise un sélecteur plus générique qui fonctionnera même si la classe exacte est différente
      featureSteps.push({
        element: '[data-tour="dons-link"], .dons-link, .sidebar-container a[href*="dons"]',
        popover: {
          title: 'Mes dons',
          description: 'Voir tous mes dons mensuels, ponctuels et quotidiens.',
          position: 'right'
        }
      });
      
      // Mes Abonnements
      featureSteps.push({
        element: '[data-tour="abonnements-link"], .abonnements-link, .sidebar-container a[href*="abonnements"]',
        popover: {
          title: 'Mes abonnements',
          description: 'Gérer mes abonnements. Récupérer des informations sur mes abonnements en cours.',
          position: 'right'
        }
      });
      
      // Mes Campagnes
      featureSteps.push({
        element: '[data-tour="campagnes-link"], .campagnes-link, .sidebar-container a[href*="campagnes"]',
        popover: {
          title: 'Mes campagnes',
          description: 'Gérez vos campagnes de dons, créez-en de nouvelles, mettez-les en pause ou arrêtez-les.',
          position: 'right'
        }
      });
      
      // Don hors ligne
      featureSteps.push({
        element: '[data-tour="don-hors-ligne-link"], .don-hors-ligne-link, .sidebar-container a[href*="don-hors-ligne"]',
        popover: {
          title: 'Don hors ligne',
          description: 'Générez des reçus fiscaux pour les dons effectués hors ligne.',
          position: 'right'
        }
      });
      
      // Gestion des reçus fiscaux
      featureSteps.push({
        element: '[data-tour="recus-fiscaux-link"], .recus-fiscaux-link, .sidebar-container a[href*="recu"]',
        popover: {
          title: 'Gestion des reçus fiscaux',
          description: 'Permet d\'avoir une vue globale sur vos reçus fiscaux.',
          position: 'right'
        }
      });
      
      // Paramètres (uniquement si donations est activé)
      featureSteps.push({
        element: '[data-tour="parametres-link"], .parametres-link, .sidebar-container a[href*="param"]',
        popover: {
          title: 'Paramètres',
          description: 'Configurez vos préférences et accédez aux options avancées.',
          position: 'right'
        }
      });
    }
    
    // === SECTION CANTINE SI ACTIVÉE ===
    if (prefs.cantine) {
      // Commandes cantine - utilisation de sélecteurs plus génériques
      featureSteps.push({
        element: '[data-tour="cantine-link"], .cantine-link, .sidebar-container a[href*="cantine"]',
        popover: {
          title: 'Commande cantine',
          description: 'Permet de voir vos commandes de la cantine.',
          position: 'right'
        }
      });
      
      // Nouvelle commande
      featureSteps.push({
        element: '[data-tour="commande-cantine-link"], .commande-cantine-link, .sidebar-container a[href*="commande"]',
        popover: {
          title: 'Nouvelle commande',
          description: 'Permet de commander à nouveau pour la cantine.',
          position: 'right'
        }
      });
      
      // Menu cantine
      featureSteps.push({
        element: '[data-tour="menu-cantine-link"], .menu-cantine-link, .sidebar-container a[href*="menu"]',
        popover: {
          title: 'Menu cantine',
          description: 'Permet de voir le menu de la semaine.',
          position: 'right'
        }
      });
    }
    
    // === SECTION SUIVI VÉHICULE SI ACTIVÉE ===
    if (prefs.suiviVehicule) {
      // Section principale véhicule - utilisation de sélecteurs plus génériques
      featureSteps.push({
        element: '[data-tour="vehicule-link"], .vehicule-link, .sidebar-container a[href*="vehicule"]',
        popover: {
          title: 'Suivi des véhicules',
          description: 'Accédez au suivi et à la gestion de vos véhicules.',
          position: 'right'
        }
      });
    }
    
    // === INFORMATION (TOUJOURS PRÉSENTE) === - utilisation de sélecteurs plus génériques
    featureSteps.push({
      element: '[data-tour="informations-link"], .informations-link, .sidebar-container a[href*="info"]',
      popover: {
        title: 'Informations',
        description: 'Les informations de l\'association, à mettre à jour à chaque fois.',
        position: 'right'
      }
    });

    // IMPORTANT: On retourne TOUTES les étapes sans filtrer par page
    // pour s'assurer que tous les éléments de la sidebar sont bien inclus dans le tutoriel
    console.log(`Nombre d'étapes générées pour le tour: ${commonSteps.length + featureSteps.length}`);
    
    // Toujours retourner toutes les étapes pour afficher le tutoriel complet
    return [...commonSteps, ...featureSteps];
  }
}
