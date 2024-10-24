/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";
import Bills from "../containers/Bills.js"; 
import { formatDate, formatStatus } from '../app/format.js';

import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';



describe("Given I am connected as an employee", () => {
  beforeEach(() => {
    // Simuler la connexion en tant qu'employé
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }));
    const root = document.createElement("div");
    root.setAttribute("id", "root");
    document.body.append(root);
    router();
  });

  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId('icon-window'));
      const windowIcon = screen.getByTestId('icon-window');
      expect(windowIcon).toHaveClass('active-icon');
    });

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/).map(a => a.innerHTML);
      const datesSorted = [...dates].sort((a, b) => new Date(b) - new Date(a));
      expect(dates).toEqual(datesSorted);
    });

    describe("when I click on 'Nouvelle note de frais'", () => {
      test("then I should be redirected to the page 'envoyer une note de frais'", async () => {
        window.onNavigate(ROUTES_PATH.Bills);
        const onNavigate = jest.fn();
        
        const billsInstance = new Bills({
          document,
          onNavigate,
          store: mockStore, // Utilisation du mockStore ici
          localStorage: window.localStorage
        });

        document.body.innerHTML = BillsUI({ data: [] });
        await waitFor(() => screen.getByTestId('btn-new-bill'));

        const buttonNewBill = screen.getByTestId('btn-new-bill');
        buttonNewBill.addEventListener('click', billsInstance.handleClickNewBill.bind(billsInstance));

        userEvent.click(buttonNewBill);
        expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH.NewBill);
      });
    });

    describe("When I click on an icon 'eye'", () => {
      test("Then a modal should open with the bill image", () => {
        const icon = document.createElement('div');
        icon.setAttribute('data-bill-url', 'https://fakeurl.com/bill.jpg');

        $.fn.modal = jest.fn();
        const modal = document.createElement('div');
        modal.setAttribute('id', 'modaleFile');
        modal.innerHTML = '<div class="modal-body"></div>';
        document.body.append(modal);

        const billsInstance = new Bills({ document, onNavigate: jest.fn(), store: mockStore, localStorage: window.localStorage });
        billsInstance.handleClickIconEye(icon);

        const modalBody = document.querySelector('.modal-body');
        expect(modalBody.innerHTML).toContain('https://fakeurl.com/bill.jpg');
        expect($.fn.modal).toHaveBeenCalledWith('show');
      });
    });
  });

  describe("getBills", () => {
  let billsInstance;
  let mockStore;

  beforeEach(() => {
    // Mock du store avec un retour correct pour la méthode bills().list()
    mockStore = {
      bills: jest.fn(() => ({
        list: jest.fn().mockResolvedValue([
          { id: '1', date: '2022-10-10', status: 'pending' },
          { id: '2', date: '2022-10-11', status: 'accepted' },
          { id: '3', date: 'invalid date', status: 'accepted' },
          { id: '4', date: '2022-10-12', status: 'pending' }
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
    expect(bills.length).toBe(4);  // Vérifie qu'il y a 4 factures
    expect(bills[0].date).toBe(formatDate('2022-10-10'));  // Vérifie que la date est formatée
    expect(bills[0].status).toBe(formatStatus('pending'));  // Vérifie que le statut est formaté
  });

  test("should handle errors in formatDate gracefully", async () => {
    // Spy sur console.log pour vérifier les erreurs
    const consoleSpy = jest.spyOn(console, 'log');

    // Appel de getBills()
    const bills = await billsInstance.getBills();

    // Vérifier que la console a logué l'erreur pour l'élément avec une date invalide
    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error), 'for', expect.objectContaining({ id: '3' }));

    // La facture avec une date invalide doit conserver la date brute
    expect(bills[2].date).toBe('invalid date');

    // Nettoyer le spy
    consoleSpy.mockRestore();
  });
});

});

describe("getBills", () => {
  let billsInstance;
  let mockStore;

  beforeEach(() => {
    // Mock du store et de la méthode bills().list()
    mockStore = {
      bills: jest.fn(() => ({
        list: jest.fn()
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

  test("should display 404 error", async () => {
    // Simuler une erreur 404
    mockStore.bills.mockImplementationOnce(() => ({
      list: jest.fn().mockRejectedValueOnce(new Error("404 Not Found"))
    }));
    
    // Appel de getBills()
    await billsInstance.getBills();
    
    // Vérifie que le message d'erreur est affiché
    const errorMessage = await screen.findByText(/404 Not Found/i);
    expect(errorMessage).toBeInTheDocument();
  });
  
  test("should display 500 error", async () => {
    // Simuler une erreur 500
    mockStore.bills.mockImplementationOnce(() => ({
      list: jest.fn().mockRejectedValueOnce(new Error("500 Internal Server Error"))
    }));
    
    // Appel de getBills()
    await billsInstance.getBills();
    
    // Vérifie que le message d'erreur est affiché
    const errorMessage = await screen.findByText(/500 Internal Server Error/i);
    expect(errorMessage).toBeInTheDocument();
  });
  
});
