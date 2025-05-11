
module roz_sui_contracts::roz_sui_contracts {
    use std::string::{String, utf8};
    use sui::table::{Self, Table};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};

    const ContractWallet: address = @0x1;
    const EInsufficientFunds: u64 = 1;
    const EJOBISDONE: u64 = 2;
    const EINVALIDACTION: u64 = 3;

    public struct Bidder has store {
        uid: UID,
        wallet: address,
        overview: String,
        cv_link: String,
        staked_asset: Balance<SUI>
    }


    public struct Agent has key {
        id: UID,
    }
    
    public struct Job has store {
        uid: UID,
        creator: address,
        title: String,
        description: String,
        bidders:  Table<ID, Bidder>,
        bidder_keys: vector<ID>,
        assigned_to: Option<ID>,
        aggrement_url: String,
        fee: Balance<SUI>,
        is_complete: bool,
        is_agent_action: bool
    }

    public struct Joblist has key, store {
        id: UID,
        list: Table<ID, Job>
    }
    
    fun init(ctx: &mut sui::tx_context::TxContext) {
        let job_list = Joblist { 
            id: object::new(ctx), 
            list: table::new(ctx) 
            };

        let agent = Agent {
            id: object::new(ctx)
        };

        transfer::share_object(job_list);
        transfer::transfer(agent, ContractWallet);
    }


    public fun list_job(
        title: String, 
        description: String,
        fee_amount: u64,
        joblist: &mut Joblist,
        staked_fee_object: Coin<SUI>,
        ctx: &mut TxContext
    ){
        let uid = object::new(ctx);
        let base_id = *object::uid_as_inner(&uid);
        assert!(coin::value(&staked_fee_object) >= fee_amount, EInsufficientFunds);
        let user_asset: Balance<SUI> = coin::into_balance(staked_fee_object);
        let creator = tx_context::sender(ctx);
        let new_job = Job {
                uid,
                creator,
                title,
                description,
                bidders:  table::new(ctx),
                bidder_keys: vector::empty(),
                assigned_to: option::none(),
                aggrement_url: utf8(b"Not assigned"),
                fee: user_asset,
                is_complete: false,
                is_agent_action: true
            };
            table::add(&mut joblist.list, base_id, new_job);
    }


    public fun handle_job(
        _agent: &Agent,
        self_bidder: bool,
        job_id: ID,
        job_list: &mut Joblist,
        ctx: &mut TxContext
    ) {
        let job = table::borrow_mut(&mut job_list.list, job_id);
        if(self_bidder) {
            let pay_amount = balance::value(&job.fee);
            let payment_object = coin::take(&mut job.fee, pay_amount , ctx);
            transfer::public_transfer(payment_object, ContractWallet);
            job.is_complete = true;
        } else {
            job.is_agent_action = false;
        };
    }

    public fun apply_to_job(
        job_id: ID,
        job_list: &mut Joblist,
        bidder_overview: String,
        bidder_cv_link: String,
        bidder_asset: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let uid = object::new(ctx);
        let base_id = *object::uid_as_inner(&uid);
        let job = table::borrow_mut(&mut job_list.list, job_id);
        assert!(coin::value(&bidder_asset) >= balance::value(&job.fee), EInsufficientFunds);
        assert!(job.is_agent_action == false, EINVALIDACTION);
        let asset: Balance<SUI> = coin::into_balance(bidder_asset);
        assert!(job.is_complete == false, EJOBISDONE);
        let new_bidder = Bidder {
            uid,
            wallet: tx_context::sender(ctx),
            overview: bidder_overview,
            cv_link: bidder_cv_link,
            staked_asset: asset,
        };
        table::add(&mut job.bidders, base_id, new_bidder);
        vector::push_back(&mut job.bidder_keys, base_id);
    }

    public fun assign_job(
        _agent: &Agent,
        job_id: ID,
        job_list: &mut Joblist,
        aggrement_url: String,
        bidder_id: ID
    ) {
        let job = table::borrow_mut(&mut job_list.list, job_id);
        assert!(job.is_complete == false, EJOBISDONE);
        job.assigned_to = option::some(bidder_id);
        job.aggrement_url = aggrement_url;
    }

    public fun complete_job(
        _agent: &Agent,
        job_id: ID,
        job_list: &mut Joblist,
        ctx: &mut TxContext
    ) {
        let job = table::borrow_mut(&mut job_list.list, job_id);
        assert!(job.is_complete == false, EJOBISDONE);

        let employer = option::extract(&mut job.assigned_to);
        let bidder_details = table::borrow_mut( &mut job.bidders, employer); 

        let pay_amount = balance::value(&job.fee);
        let payment_object = coin::take(&mut job.fee, pay_amount , ctx);
        transfer::public_transfer(payment_object, bidder_details.wallet);

        while(vector::length(&job.bidder_keys) > 0){
            let bidder = table::borrow_mut(&mut job.bidders, vector::pop_back(&mut job.bidder_keys));
            let staked_amount = balance::value(&bidder.staked_asset);
            let staked_object = coin::take(&mut bidder.staked_asset, staked_amount , ctx);
            transfer::public_transfer(staked_object, bidder.wallet);
        };
        job.is_complete = true;
    }
}