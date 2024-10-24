/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'; // Import des matchers Jest-DOM
import { fireEvent, screen, waitFor } from "@testing-library/dom"; // Ajout de fireEvent
import NewBillUI from "../views/NewBillUI.js"; // Import de l'UI
import NewBill from "../containers/NewBill.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import router from "../app/Router.js";

// Mock du store
const mockStore = {
  bills: jest.fn(() => ({
    create: jest.fn(() => 
      Promise.resolve({ fileUrl: "https://fake-url.com/image.png", key: "1234" })
    )
  })),
};

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then the NewBill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }));

      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();

      // Navigation vers la page NewBill
      window.onNavigate(ROUTES_PATH.NewBill);

      // Attente que l'icône NewBill soit visible
      await waitFor(() => screen.getByTestId('icon-mail'));

      const newBillIcon = screen.getByTestId('icon-mail');

      // Vérification : l'icône doit avoir la classe 'active-icon'
      expect(newBillIcon).toHaveClass('active-icon');
    });
  });

  describe("When I upload a file with an invalid type", () => {
    test("should display an alert if the file type is invalid", () => {
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

      Object.defineProperty(window, 'localStorage', { value: localStorageMock });
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }));

      // Afficher l'interface NewBill dans le DOM
      document.body.innerHTML = NewBillUI();

      const newBill = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: window.localStorage,
      });

      const fileInput = screen.getByTestId("file");
      const invalidFile = new File(["dummy content"], "test.pdf", { type: "application/pdf" });

      // Déclenchement de l'événement "change" sur l'input de fichier
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      // Vérifications
      expect(alertMock).toHaveBeenCalledWith(
        "Veuillez télécharger un fichier avec une extension JPG, JPEG ou PNG."
      );
      expect(fileInput.value).toBe(""); // Le champ doit être réinitialisé

      alertMock.mockRestore();
    });
  });
});


test("should accept a valid file type and call store.bills().create", async () => {
  // Mock du store pour simuler la création de facture
  const mockCreate = jest.fn().mockResolvedValue({ fileUrl: "http://test.com", key: "123" });

  const mockStore = {
    bills: jest.fn(() => ({
      create: mockCreate,
    })),
  };

  // Instanciation de NewBill avec les dépendances nécessaires
  const newBill = new NewBill({ document, onNavigate: jest.fn(), store: mockStore, localStorage: window.localStorage });

  // Simuler le fichier à uploader
  const fileInput = screen.getByTestId("file");
  const validFile = new File(["dummy content"], "test.jpg", { type: "image/jpeg" });

  // Simuler le changement de fichier (upload)
  fireEvent.change(fileInput, { target: { files: [validFile] } });

  // Attendre que la fonction create soit appelée
  await waitFor(() => expect(mockCreate).toHaveBeenCalled());

  // Vérifications finales
  expect(newBill.fileUrl).toBe("http://test.com");
  expect(newBill.billId).toBe("123");
});




test("should create a bill and navigate to Bills page", () => {
  const mockUpdateBill = jest.fn(); // Mock de la méthode updateBill
  const mockNavigate = jest.fn(); // Mock de la fonction de navigation

  // Configuration du localStorage pour simuler un utilisateur connecté
  Object.defineProperty(window, "localStorage", { value: localStorageMock });
  window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));

  // Configuration du DOM
  document.body.innerHTML = NewBillUI();

  const newBill = new NewBill({
    document,
    onNavigate: mockNavigate,
    store: null, // Pas besoin de store ici
    localStorage: window.localStorage,
  });

  // Mock de la méthode updateBill sur l'instance newBill
  newBill.updateBill = mockUpdateBill;

  // Simulation de l'utilisateur remplissant le formulaire
  screen.getByTestId("expense-type").value = "Transports";
  screen.getByTestId("expense-name").value = "Taxi";
  screen.getByTestId("amount").value = "100";
  screen.getByTestId("datepicker").value = "2024-10-18";
  screen.getByTestId("vat").value = "10";
  screen.getByTestId("pct").value = "20";
  screen.getByTestId("commentary").value = "Trajet pro";
  newBill.fileUrl = "https://fake-url.com/image.png";
  newBill.fileName = "image.png";

  // Soumission du formulaire
  const form = screen.getByTestId("form-new-bill");
  fireEvent.submit(form);

  // Vérifications : on s'assure que updateBill et onNavigate ont bien été appelés
  expect(mockUpdateBill).toHaveBeenCalledWith({
    type: "Transports",
    name: "Taxi",
    amount: 100,
    date: "2024-10-18",
    vat: "10",
    pct: 20,
    commentary: "Trajet pro",
    fileUrl: "https://fake-url.com/image.png",
    fileName: "image.png",
    status: "pending",
  });

  expect(mockNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
});



