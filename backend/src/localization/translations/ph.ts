import { TranslationMap } from '../index';

const translations: TranslationMap = {
  errors: {
    "Name is required": "Kinakailangan ang pangalan",
    "Description is required": "Kinakailangan ang paglalarawan",
    "Image is required": "Kinakailangan ang larawan",
    "Invalid parent ID": "Di-wastong format ng parent ID",
    "Invalid date format": "Mangyaring magbigay ng wastong petsa",
    "Invalid account ID": "Di-wastong format ng account ID",
    "Invalid from date format": "Di-wastong format ang from date",
    "Invalid to date format": "Di-wastong format ang to date",
    "At least one field must be provided": "Dapat kang mag-update ng kahit isang field"
  },
  validations: {
    required: "Kinakailangan ang {{field}}",
    min_length: "Ang {{field}} ay dapat hindi bababa sa {{length}} character",
    invalid_format: "Di-wasto ang format ng {{field}}"
  },
  transactions: {
    created_success: "Matagumpay na nalikha ang transaksyon",
    updated_success: "Matagumpay na na-update ang transaksyon",
    deleted_success: "Matagumpay na natanggal ang transaksyon",
    not_found: "Hindi natagpuan ang transaksyon"
  },
  accounts: {
    created_success: "Matagumpay na nalikha ang account",
    updated_success: "Matagumpay na na-update ang account",
    deleted_success: "Matagumpay na natanggal ang account",
    not_found: "Hindi natagpuan ang account"
  },
  categories: {
    created_success: "Matagumpay na nalikha ang kategorya",
    updated_success: "Matagumpay na na-update ang kategorya",
    deleted_success: "Matagumpay na natanggal ang kategorya",
    not_found: "Hindi natagpuan ang kategorya"
  }
};

export default translations; 