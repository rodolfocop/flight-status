module.exports = {
    entry: {
        polyfills: ['./node_modules/es6-shim/es6-shim.js', './node_modules/angular2/bundles/angular2-polyfills'],
        vendor: './app/vendor.ts',
        app: './app/main.ts'
    },
    output: {
        path: __dirname + "/dist", publicPath: 'dist/', filename: "[name].bundle.js"
    },
    resolve: {
        extensions: ['', '.js', '.ts']
    },
    module: {
        loaders: [
            {
                test: /\.ts/,
                loaders: ['ts-loader'],
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                loader: 'style-loader!css-loader'
            },
            {
                test: /\.(png|woff|woff2|eot|ttf|svg)$/,
                loader: 'url-loader?limit=100000'
            }
        ]
    }
};
