import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { throwError } from 'rxjs';


@Injectable({
    providedIn: 'root'
})
export class OnboardingService {
    private apiUrl = environment.apiUrl;

    private readonly ONBOARDING_KEY = 'myamana_onboarding_completed';

    // BehaviorSubject pour stocker l'état d'onboarding et éviter les appels multiples
    private onboardingState$ = new BehaviorSubject<any>(null);
    private isFetching = false;

    constructor(private http: HttpClient) { }

    /**
     * Réinitialise l'état d'onboarding (à appeler lors du logout)
     */
    clearOnboardingState(): void {
        this.onboardingState$.next(null);
        this.isFetching = false;
    }

    /**
     * Retourne l'état actuel de l'onboarding sans faire d'appel API
     */
    getOnboardingState(): any {
        return this.onboardingState$.getValue();
    }

    /**
     * Vérifie si l'utilisateur a déjà complété l'onboarding
     * Utilise un état partagé pour éviter les appels API multiples
     */
    isOnboardingCompleted(): Observable<any> {
        // Si on a déjà les données, les retourner directement
        const currentState = this.onboardingState$.getValue();
        if (currentState !== null) {
            return of(currentState);
        }

        // Si un appel est déjà en cours, retourner l'observable du BehaviorSubject
        if (this.isFetching) {
            return this.onboardingState$.asObservable().pipe(
                // Filtrer les valeurs null (en attente)
                map(state => {
                    if (state === null) {
                        throw new Error('waiting');
                    }
                    return state;
                }),
                catchError(() => this.fetchOnboardingFromApi())
            );
        }

        return this.fetchOnboardingFromApi();
    }

    /**
     * Effectue l'appel API pour récupérer l'état d'onboarding
     */
    private fetchOnboardingFromApi(): Observable<any> {
        this.isFetching = true;

        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        return this.http.get<any>(`${this.apiUrl}/isOnboardingCompleted`, {
            headers,
            withCredentials: true
        }).pipe(
            map(response => {
                if (response.result && response.result.isOnboarded === 0) {
                    localStorage.setItem(this.ONBOARDING_KEY, 'true');
                } else {
                    localStorage.removeItem(this.ONBOARDING_KEY);
                }
                // Stocker la réponse dans le BehaviorSubject
                this.onboardingState$.next(response);
                this.isFetching = false;
                return response;
            }),
            catchError((error) => {
                console.error('Erreur lors de la récupération des statistiques:', error);
                this.isFetching = false;
                return throwError(() => error);
            })
        );
    }

    /**
     * Marque l'onboarding comme complété
     * @param services Les services sélectionnés par l'utilisateur
     * @param markTutorialDone Si true, marque également le tutoriel comme terminé
     */
    /**
     * Marque l'onboarding comme complété et enregistre les services choisis.
     * @param services liste des services: 'donations', 'cantine', 'vehicle'
     * @param markTutorialDone si true marque aussi le tutoriel comme terminé
     * @param isOnboarded indique si l'onboarding doit être considéré comme complété
     */
    completeOnboarding(services: string[], markTutorialDone: boolean = false, isOnboarded: boolean = true): Observable<boolean> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });
        
        // Préparer les données pour l'API
        const requestData = {
            donations: services.includes('donations'),
            cantine: services.includes('cantine'),
            suiviVehicule: services.includes('vehicle'),
            benevolat: services.includes('benevolat'),
            isOnboarded: isOnboarded,
            tutorielDone: markTutorialDone
        };
        
        // Envoyer les données au serveur
        return this.http.post<any>(`${this.apiUrl}/completeOnboarding`, requestData, {
            headers,
            withCredentials: true
        }).pipe(
            map(response => {
                console.log('Onboarding complété avec succès:', response);
                localStorage.setItem(this.ONBOARDING_KEY, 'true');
                
                return true;
            }),
            catchError((error) => {
                console.error('Erreur lors de la mise à jour de l\'onboarding:', error);
                return of(false);
            })
        );
    }

    /**
     * Réinitialise l'état d'onboarding (pour les tests)
     */
    resetOnboarding(): void {
        localStorage.removeItem(this.ONBOARDING_KEY);
    }
    
}
