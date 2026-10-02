/**
 * Custom hook to capitalize the first letter of a string
 * @returns Function to capitalize first letter
 */
export const useCapitalize = () => {
  const capitalizeFirstLetter = (str: string): string => {
    if (!str) return 'N/A';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return { capitalizeFirstLetter };
};
