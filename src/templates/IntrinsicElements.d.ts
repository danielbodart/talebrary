declare namespace JSX {
    interface HtmlBodyTag {
        is?: string
    }

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