import fs from 'fs'

import GlkOteLib from 'glkote-term'
import readline from "readline";
import MuteStream from 'mute-stream'


const formats = [
    {
        id: 'bocfel',
        extensions: /z([3458]|blorb)$/,
        engine: 'bocfel.js',
    },

    {
        id: 'glulxe',
        extensions: /(gblorb|ulx)$/,
        engine: 'glulxe.js',
    },

    {
        id: 'git',
        extensions: /(gblorb|ulx)$/,
        engine: 'git.js',
    },

    {
        id: 'hugo',
        extensions: /hex$/,
        engine: 'hugo.js',
    },

    {
        id: 'scare',
        extensions: /taf$/,
        engine: 'scare.js',
    },

    {
        id: 'tads',
        extensions: /(gam|t3)$/,
        engine: 'tads.js',
    },
]

async function run(){
    const dir = import.meta.dir;

    const storyfile = dir + '/../Varkana.gblorb';

    const format = formats.find(f =>  f.extensions.test(storyfile))


    if (!format) throw new Error('Unsupported format')

    // Readline options
    const rem = false;
    let io_opts
    if (rem)
    {
        io_opts = {
            stdin: process.stdin,
            stdout: process.stdout,
        }
    }
    else
    {
        const stdin = process.stdin
        const stdout = new MuteStream()
        stdout.pipe(process.stdout)
        const rl = readline.createInterface({
            input: stdin,
            output: stdout,
            prompt: '',
        })
        io_opts = {
            rl: rl,
            stdin: stdin,
            stdout: stdout,
        }
    }

    // RemGlk or dumb mode GlkOte
    const GlkOte = rem ? GlkOteLib.RemGlkOte : GlkOteLib.DumbGlkOte

    const options = {
        Dialog: new GlkOteLib.DumbGlkOte.Dialog(io_opts),
        Glk: {},
        GlkOte: new GlkOte(io_opts),
        wasmBinary: fs.readFileSync(new URL(`${dir}/../node_modules/emglken/build/${format.id}-core.wasm`, import.meta.url))
    }

    process.on('unhandledRejection', (error:any) => {
        if (error.name !== 'ExitStatus' || error.message !== 'Program terminated with exit(0)') {
            console.log('Unhandled Rejection:', error)
        }
        process.exit()
    })

    const engine = (await import(`${dir}/../node_modules/emglken/src/${format.id}.js`)).default
    const vm = new engine()
    vm.init(fs.readFileSync(storyfile), options)
    vm.start()
}

run()