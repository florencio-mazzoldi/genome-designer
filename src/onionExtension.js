import React from 'react';
import { render as reactRender } from 'react-dom';

import {OnionForGenomeDesigner} from './extensions/onion2/OnionForGenomeDesigner';


class OnionViewer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            width: props.container.offsetWidth,
            height: props.container.offsetHeight,
        };
        //console.log(this.enzymeList);
    }

    componentWillMount() {
        const self = this;
        let lastBlock;

        this.setState({
            block: null,
            rendered: Date.now(),

        });

        const storeSubscriber = (store) => {
            const { currentBlocks } = store.ui;
            //console.log("--block",store.ui);
            const block = (Array.isArray(currentBlocks) && currentBlocks.length) ? store.blocks[currentBlocks[0]] : null;
            // all instances in the store are immutables, so you can just do a reference equality check to see if it has changed
            // this would also be a good place to convert to the onion format
            // it would be a great place to memoize
            // (i.e. return same value if input === previous input, rather than storing it explicitly in the component,
            // and then you can reuse the selector for all things you retrieve from the store)
            //if (!!block && block !== lastBlock) {
            //  //note that right now, blocks dont have a sequence... this will work but nothing will be returned
            //  block.getSequence()
            //    .then(sequence => {
            //      self.setState({
            //        blocks,
            //        sequence,
            //      });
            //    });
            //  lastBlock = block;
            //}

            if(Array.isArray(currentBlocks) && currentBlocks.length) {
                console.log("currentBlocks",currentBlocks);
                let readBlockCount = currentBlocks.length;
                let onionBlocks = [];
                let start = 0;
                let totalSequence = "";
                let readSequenceFromBlock = (i,count)=>{
                    let block = store.blocks[currentBlocks[i]];
                    block.getSequence().then(sequence=>{
                        if(sequence) {
                            onionBlocks.push({
                                color: block.metadata.color,
                                start: start,
                                length: sequence.length,
                                name: block.metadata.name,
                            });
                            start += sequence.length;
                            totalSequence += sequence;
                            if (i == count - 1) {
                                this.setState({blocks: onionBlocks, sequence: totalSequence});
                            }
                            else {
                                readSequenceFromBlock(i + 1, count);
                            }
                        }
                    });
                };
                readSequenceFromBlock(0,readBlockCount);
            }
            else{
                console.log("no block");
            }
        };





        this.subscriber = window.gd.store.subscribe(storeSubscriber);
        this.updateDimensions();
    }

    updateDimensions(){
        //let width = this.props.container.offsetWidth;
        //let height = this.props.container.offsetHeight;
        let width = $(".ProjectDetail").width();
        let height= $(".ProjectDetail").height();
        height-= $(".ProjectDetail-heading").height();
		//height-=100;
        height = Math.max(1,height);

        console.log("new dimensions",width,height);
        this.setState({width: width,height:height});
    }

    componentDidMount() {
        window.addEventListener("resize", this.updateDimensions.bind(this));
        this.updateDimensions();
    }

    componentWillUnmount() {
        this.subscriber();
        window.removeEventListener("resize", this.updateDimensions.bind(this));
    }

    render() {
        let {sequence,features,width,height,blocks} = this.state;
        return (
            <OnionForGenomeDesigner
                sequence={sequence}
                features={features}
                width={width}
                height={height-50}
                blocks={blocks}
            ></OnionForGenomeDesigner>
        )
    }
}

/* register with store */
//note that if you were using redux, you could wrap your component in a Provider, and pass in window.gd.store
//we'll just register directly for this example

/* rendering + registering extension */

const render = (container) => {
    container.className += " onionContainer";
    reactRender(<OnionViewer
        container={container}
    />, container);
};

const manifest = {
    id: 'onion-0.0.0',
    name: 'Sequence Detail',
    render,
};

window.gd.registerExtension('sequenceDetail', manifest);

//hack - hide Isaac's A at the bottom
const style = document.createElement('style');
style.appendChild(document.createTextNode('')); // WebKit hack :(
document.head.appendChild(style);
style.sheet.insertRule('#bp1 { position: absolute; left: -100px;}');
