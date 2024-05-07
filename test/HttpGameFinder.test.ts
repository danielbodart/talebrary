import {assertThat} from "totallylazy/asserts/assertThat.ts";
import {equals} from "totallylazy/predicates/EqualsPredicate.ts";
import {HttpGameFinder} from "../src/HttpGameFinder.ts";
import {client} from "../src/http.ts";

Deno.test("Finder", async (context) => {
    await context.step("works", async () => {
        const finder = new HttpGameFinder(client);
        const result = await finder.find("Adventure");
        console.log(result)
    });
});