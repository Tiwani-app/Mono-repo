export const emailRules = {
  required: 'Email is required.',
  pattern: {
    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address.',
  },
};

export const passwordRules = {
  required: 'Password is required.',
  minLength: {
    value: 6,
    message: 'Password must be at least 6 characters.',
  },
};
