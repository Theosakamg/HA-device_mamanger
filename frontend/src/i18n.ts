/**
 * Internationalization system
 */

type Translations = {
  [key: string]: string;
};

const translations: { [lang: string]: Translations } = {
  en: {
    app_title: 'Device Manager',
    devices_list: 'Devices',
    add_device: 'Add Device',
    edit_device: 'Edit Device',
    device_name: 'Device Name',
    device_name_placeholder: 'Enter device name',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    no_devices: 'No devices yet. Add your first device!',
    loading: 'Loading...',
    error_loading: 'Error loading devices',
    error_saving: 'Error saving device',
    error_deleting: 'Error deleting device',
    confirm_delete: 'Are you sure you want to delete this device?',
    success_created: 'Device created successfully',
    success_updated: 'Device updated successfully',
    success_deleted: 'Device deleted successfully',
  },
  fr: {
    app_title: "Gestionnaire d'Équipements",
    devices_list: 'Équipements',
    add_device: 'Ajouter un Équipement',
    edit_device: "Modifier l'Équipement",
    device_name: "Nom de l'Équipement",
    device_name_placeholder: "Entrez le nom de l'équipement",
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    no_devices: 'Aucun équipement. Ajoutez votre premier équipement !',
    loading: 'Chargement...',
    error_loading: 'Erreur lors du chargement des équipements',
    error_saving: "Erreur lors de l'enregistrement de l'équipement",
    error_deleting: "Erreur lors de la suppression de l'équipement",
    confirm_delete: 'Êtes-vous sûr de vouloir supprimer cet équipement ?',
    success_created: 'Équipement créé avec succès',
    success_updated: 'Équipement mis à jour avec succès',
    success_deleted: 'Équipement supprimé avec succès',
  },
};

class I18n {
  private currentLang: string;

  constructor() {
    // Detect browser language, fallback to English
    const browserLang = navigator.language.toLowerCase().split('-')[0];
    this.currentLang = translations[browserLang] ? browserLang : 'en';
  }

  t(key: string): string {
    return translations[this.currentLang][key] || translations['en'][key] || key;
  }

  setLanguage(lang: string): void {
    if (translations[lang]) {
      this.currentLang = lang;
    }
  }

  getCurrentLanguage(): string {
    return this.currentLang;
  }
}

export const i18n = new I18n();
