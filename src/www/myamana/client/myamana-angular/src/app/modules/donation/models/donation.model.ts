export interface DonationFormData {
  name: string;
  email: string;
  firstname: string;
  lastname: string;
  address: string;
  raison: string;
  siren: string;
  amount: number;
  payment_method_types: string;
  campagne: string;
  city: string;
  country: string;
  line1: string;
  postal_code: string;
  recu: boolean;
  asso: string;
  origin: string;
  paymentDay?: number;
  treeNamesString: string;
  productId?: string;
}

export interface AddressComponents {
  city: string;
  country: string;
  line1: string;
  postal_code: string;
}
