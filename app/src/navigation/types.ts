// TypeScript-Typen für unsere Navigation.

// Stack der eingeloggten App
export type RootStackParamList = {
  Home: undefined;
  RecipeDetail: { recipeId: string };
  RecipeForm: { editId?: string } | undefined;
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
