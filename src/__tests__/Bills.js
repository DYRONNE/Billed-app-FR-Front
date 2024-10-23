/**
 * @jest-environment jsdom
 */

import {screen, waitFor} from "@testing-library/dom"
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES_PATH} from "../constants/routes.js";
import {localStorageMock} from "../__mocks__/localStorage.js";
import router from "../app/Router.js";
import Bills from "../containers/Bills.js"; 
import { formatDate, formatStatus } from '../app/format.js';


import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event';

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      //to-do write expect expression
      expect(windowIcon).toHaveClass('active-icon')

    })
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })
  })
})

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    describe("when I click on 'Nouvelle note de frais'", () => {
      test("then I should be redirected to the page 'envoyer une note de frais'", async () => {

        // Simuler la connexion en tant qu'employé
        Object.defineProperty(window, 'localStorage', { value: localStorageMock })
        window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }))

        // Ajouter un élément root pour la navigation (prparation du DOM)
        const root = document.createElement("div")
        root.setAttribute("id", "root")
        document.body.append(root)

        // Simuler la navigation vers la page des factures
        router()
        window.onNavigate(ROUTES_PATH.Bills)

        // Mock de la fonction onNavigate (fonction fictive mockée avec la methode jest.fn qui pourra etre utilise pour voir si elle a été appelée)
        const onNavigate = jest.fn()

        // Instancier Bills avec la fonction mockée 
        const bills = new Bills({
          document,
          onNavigate,  // Injecter la fonction mockée
          store: null,
          localStorage: window.localStorage
        })

        // Ajouter le bouton au DOM pour les tests
        document.body.innerHTML = BillsUI({ data: [] })
        await waitFor(() => screen.getByTestId('btn-new-bill'))

        // Simuler l'attachement de l'événement (comme dans le constructeur de Bills)
        const buttonNewBill = screen.getByTestId('btn-new-bill')
        buttonNewBill.addEventListener('click', bills.handleClickNewBill)  // Assure l'attachement de l'événement

        // Simuler le clic avec userEvent
        userEvent.click(buttonNewBill)

        // Vérifier que la fonction onNavigate a bien été appelée avec la route 'NewBill'
        expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH.NewBill)
      })
    })
  })
})

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    describe("When I click on an icon 'eye'", () => {
      test("Then a modal should open with the bill image", () => {
        
        // Crée un élément div représentant l'icône de la facture et 
        // lui attribue un attribut 
        // data-bill-url contenant une URL fictive pour la facture.
        const icon = document.createElement('div')
        icon.setAttribute('data-bill-url', 'https://fakeurl.com/bill.jpg')

        // Mock de jQuery pour manipuler la modale
        $.fn.modal = jest.fn() // Mock de l'appel à la fonction `modal` pour afficher la modale
        const modal = document.createElement('div')
        modal.setAttribute('id', 'modaleFile')
        modal.innerHTML = '<div class="modal-body"></div>'
        document.body.append(modal)

        // Crée une instance de Bills
        const bills = new Bills({ document, onNavigate: jest.fn(), store: null, localStorage: window.localStorage })

        // Appel de la méthode handleClickIconEye avec l'élément icon mocké
        bills.handleClickIconEye(icon)

        // Vérifie si l'URL de la facture a été insérée dans la modale
        const modalBody = document.querySelector('.modal-body')
        expect(modalBody.innerHTML).toContain('https://fakeurl.com/bill.jpg')

        // Vérifie si la modale a été affichée
        expect($.fn.modal).toHaveBeenCalledWith('show')
      })
    })
  })
})




describe("getBills", () => {
  let billsInstance;
  let mockStore;

  beforeEach(() => {
    // Mock du store et de la méthode bills().list()
    mockStore = {
      bills: jest.fn(() => ({
        list: jest.fn().mockResolvedValue([
          { id: '1', date: '2022-10-10', status: 'pending' },
          { id: '2', date: 'invalid date', status: 'accepted' }
        ])
      }))
    };
    
    // Instancier Bills avec le store mocké
    billsInstance = new Bills({
      document: document,
      onNavigate: jest.fn(),
      store: mockStore,
      localStorage: window.localStorage
    });
  });

  test("should return formatted bills", async () => {
    // Appel de getBills()
    const bills = await billsInstance.getBills();

    // Vérifier que les factures sont bien formatées
    expect(bills.length).toBe(2);  // Il y a 2 factures
    expect(bills[0].date).toBe(formatDate('2022-10-10'));  // Vérifier que la date est formatée
    expect(bills[0].status).toBe(formatStatus('pending'));  // Vérifier que le statut est formaté
  });

  test("should handle errors in formatDate gracefully", async () => {
    // Spy sur console.log pour vérifier les erreurs
    const consoleSpy = jest.spyOn(console, 'log');
    
    // Appel de getBills()
    const bills = await billsInstance.getBills();

    // Vérifier que la console a logué l'erreur
    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error), 'for', expect.objectContaining({ id: '2' }));
    
    // La facture avec une date invalide doit conserver la date brute
    expect(bills[1].date).toBe('invalid date');
    
    // Nettoyer le spy
    consoleSpy.mockRestore();
  });
});
