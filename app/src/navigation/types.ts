// TypeScript-Typen für unsere Navigation.

// Stack der eingeloggten App
export type RootStackParamList = {
  Home: undefined;
  RecipeDetail: { recipeId: string };
  // `editId` zum Bearbeiten, `kind` für neu angelegte Rezepte (food/drink).
  // Beim Bearbeiten wird kind aus der DB gelesen, der Param ignoriert.
  RecipeForm: { editId?: string; kind?: "food" | "drink" } | undefined;
  Filter: undefined;
};

// Stack vor dem Login
export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
