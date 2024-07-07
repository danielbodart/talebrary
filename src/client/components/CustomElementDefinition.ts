export class CustomElementDefinition<C extends CustomElementConstructor> {
    constructor(public name: string,
                public construct: C,
                public options?: ElementDefinitionOptions) {
    }

    apply(registry: CustomElementRegistry): C {
        if (!registry.get(this.name)) registry.define(this.name, this.construct, this.options);
        return this.construct;
    }
}