import Block from '../../models/Block';
import partList from './partList.json';

export default partList.map(part => new Block(part));
