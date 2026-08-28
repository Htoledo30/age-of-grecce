export {};

declare global {
  interface Window {
    readonly nativo?: {
      readonly plataforma: string;
      readonly versoes: {
        readonly electron: string;
        readonly chrome: string;
        readonly node: string;
      };
      sair(): void;
    };
  }
}
