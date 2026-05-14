export const required = (fieldName: string) => ({
  required: `${fieldName} is required.`,
});

export const emailRules = {
  required: 'Email is required.',
  pattern: {
    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address.',
  },
};

export const phoneRules = {
  required: 'Phone number is required.',
  pattern: {
    value: /^(\+234|0)[0-9]{10}$/,
    message: 'Please enter a valid Nigerian phone number.',
  },
};

export const passwordRules = {
  required: 'Password is required.',
  minLength: {
    value: 6,
    message: 'Password must be at least 6 characters.',
  },
};
