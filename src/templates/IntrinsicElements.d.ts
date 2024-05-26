declare namespace JSX {
    interface HtmlAnchorTag {
        href?: string | false
    }

    interface HtmlImageTag {
        loading: 'lazy' | 'eager'
    }
}