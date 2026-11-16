module.exports = {
    entry: {
        polyfills: ['./node_modules/es6-shim/es6-shim.js', './node_modules/angular2/bundles/angular2-polyfills'],
        vendor: './app/vendor.ts',
        app: './app/main.ts'
    },
    output: {
        path: __dirname + "/dist", publicPath: 'dist/', filename: "[name].bundle.js"
    },
    devtool: 'source-map',
    resolve: {
        extensions: ['', '.js', '.ts', '.less', '.html']
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
            },
            {
                test: /\.less$/,
                loader: 'raw!less',
                exclude: /node_modules/
            },
            {
                test: /\.html$/,
                loader: 'raw',
                exclude: /node_modules/
            }
        ]
    }
};
