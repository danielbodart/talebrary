import {fonts} from "./fonts.tsx";
import * as elements from "typed-html";
import {Fragment} from "./Fragment.tsx";

export const header =
    <Fragment>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        {fonts()}
    </Fragment>;
