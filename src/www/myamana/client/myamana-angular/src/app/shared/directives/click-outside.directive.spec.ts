import { ClickOutsideDirective } from './click-outside.directive';
import { ElementRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';

describe('ClickOutsideDirective', () => {
  it('should create an instance', () => {
    // Créer un mock pour ElementRef
    const elementRefMock = { nativeElement: document.createElement('div') } as ElementRef;
    
    // Créer un mock pour le document
    const documentMock = document;
    
    // Créer l'instance de la directive avec les dépendances requises
    const directive = new ClickOutsideDirective(elementRefMock, documentMock);
    
    expect(directive).toBeTruthy();
  });
});
