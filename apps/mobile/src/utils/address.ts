import { Address } from "../types/user";

export const EMPTY_ADDRESS: Address = {
  street: "",
  apartment: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
};

export const normalizeAddress = (address: Address): Address => ({
  street: address.street.trim(),
  apartment: address.apartment.trim(),
  city: address.city.trim(),
  state: address.state.trim(),
  country: address.country.trim(),
  postalCode: address.postalCode.trim(),
});

export const formatAddress = (address: Address): string =>
  [
    address.street,
    address.apartment,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
