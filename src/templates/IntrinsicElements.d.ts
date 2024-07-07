declare namespace JSX {
    interface HtmlAnchorTag {
        href?: string | false
    }

    interface HtmlLinkTag {
        as?: string
    }

    interface HtmlImageTag {
        loading?: 'lazy' | 'eager'
    }
}