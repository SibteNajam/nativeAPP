/**
 * Form Validation Utilities
 * Clean, reusable validation functions for forms
 */

import { FormErrors } from '@/types/auth.types';

// Re-export FormErrors for convenience
export type { FormErrors } from '@/types/auth.types';

// Email regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirements
const MIN_PASSWORD_LENGTH = 8;

/**
 * Validate email format
 */
export const validateEmail = (email: string): string | undefined => {
    if (!email || email.trim() === '') {
        return 'Email is required';
    }
    if (!EMAIL_REGEX.test(email.trim())) {
        return 'Please enter a valid email address';
    }
    return undefined;
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): string | undefined => {
    if (!password) {
        return 'Password is required';
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
        return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    // Add more rules as needed (uppercase, number, special char)
    // if (!/[A-Z]/.test(password)) {
    //     return 'Password must contain at least one uppercase letter';
    // }
    // if (!/[0-9]/.test(password)) {
    //     return 'Password must contain at least one number';
    // }
    return undefined;
};

/**
 * Validate confirm password matches
 */
export const validateConfirmPassword = (password: string, confirmPassword: string): string | undefined => {
    if (!confirmPassword) {
        return 'Please confirm your password';
    }
    if (password !== confirmPassword) {
        return 'Passwords do not match';
    }
    return undefined;
};

/**
 * Validate first name
 */
export const validateFirstName = (firstName: string): string | undefined => {
    if (!firstName || firstName.trim() === '') {
        return 'First name is required';
    }
    if (firstName.trim().length < 2) {
        return 'First name must be at least 2 characters';
    }
    if (firstName.trim().length > 50) {
        return 'First name must be less than 50 characters';
    }
    return undefined;
};

/**
 * Validate login form
 */
export const validateLoginForm = (email: string, password: string): FormErrors => {
    const errors: FormErrors = {};

    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;

    if (!password) errors.password = 'Password is required';

    return errors;
};

/**
 * Validate registration form
 */
export const validateRegisterForm = (
    firstName: string,
    email: string,
    password: string,
    confirmPassword: string
): FormErrors => {
    const errors: FormErrors = {};

    const firstNameError = validateFirstName(firstName);
    if (firstNameError) errors.firstName = firstNameError;

    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) errors.password = passwordError;

    const confirmPasswordError = validateConfirmPassword(password, confirmPassword);
    if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

    return errors;
};

/**
 * Check if form has any errors
 */
export const hasErrors = (errors: FormErrors): boolean => {
    return Object.keys(errors).length > 0;
};

/**
 * Get first error message from form errors
 */
export const getFirstError = (errors: FormErrors): string | undefined => {
    const errorKeys = Object.keys(errors);
    return errorKeys.length > 0 ? errors[errorKeys[0]] : undefined;
};
